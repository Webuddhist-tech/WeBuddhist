import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import SegmentChatView, {
  buildHistory,
  linkCitations,
  refsInText,
} from "./SegmentChatView.tsx";
import {
  streamSegmentChat,
  SegmentChatError,
} from "@/services/worker/segmentChat";

vi.mock("@/services/worker/segmentChat", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/worker/segmentChat")
  >("@/services/worker/segmentChat");
  return { ...actual, streamSegmentChat: vi.fn() };
});

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

const mockStream = streamSegmentChat as unknown as ReturnType<typeof vi.fn>;

const SOURCES = [
  {
    ref: 1,
    type: "translation",
    segment_id: "s1",
    text_id: "t1",
    title: "English Translation",
    language: "en",
    source_link: null,
    license: null,
    snippet: "Homage to Tara",
  },
  {
    ref: 2,
    type: "commentary",
    segment_id: "s2",
    text_id: "c1",
    title: "A Commentary",
    language: "bo",
    source_link: null,
    license: null,
    snippet: "commentary snippet",
  },
];

const renderView = (props = {}) => {
  const addChapter = vi.fn();
  const handleNavigate = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <SegmentChatView
      segmentId="seg1"
      addChapter={addChapter}
      currentChapter={{ id: "chapter1" }}
      handleNavigate={handleNavigate}
      onClose={onClose}
      {...props}
    />,
  );
  return { ...utils, addChapter, handleNavigate, onClose };
};

const askQuestion = (text: string) => {
  fireEvent.change(screen.getByPlaceholderText("segment_chat.placeholder"), {
    target: { value: text },
  });
  fireEvent.submit(
    screen.getByPlaceholderText("segment_chat.placeholder").closest("form")!,
  );
};

describe("SegmentChatView helpers", () => {
  test("refsInText keeps valid refs in first-use order", () => {
    expect(refsInText("a [2] b [1][2] c [7]", new Set([1, 2]))).toEqual([2, 1]);
  });

  test("linkCitations links only known refs", () => {
    expect(linkCitations("x [1] y [9]", new Set([1]))).toBe(
      "x [1](#cite-1) y [9]",
    );
  });

  test("buildHistory includes only completed question/answer pairs", () => {
    const history = buildHistory([
      { id: "1", role: "user", content: "Q1" },
      { id: "2", role: "assistant", content: "A1", status: "done" },
      { id: "3", role: "user", content: "Q2" },
      { id: "4", role: "assistant", content: "partial", status: "error" },
    ]);
    expect(history).toEqual([
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
    ]);
  });
});

describe("SegmentChatView", () => {
  beforeEach(() => {
    mockStream.mockReset();
  });

  test("shows the intro and suggested questions before the first question", () => {
    renderView();
    expect(screen.getByText("segment_chat.intro")).toBeInTheDocument();
    expect(
      screen.getByText("segment_chat.suggestion.meaning"),
    ).toBeInTheDocument();
  });

  test("streams an answer with clickable citations and opens a cited source", async () => {
    mockStream.mockImplementation(async (_request, callbacks) => {
      callbacks.onSources({
        segment: { segment_id: "seg1", content: "verse", text: null },
        sources: SOURCES,
      });
      callbacks.onDelta("Tara is praised ");
      callbacks.onDelta("for compassion [2].");
      callbacks.onDone({ cited_refs: [2] });
    });
    const { addChapter } = renderView();

    askQuestion("Who is praised?");

    await waitFor(() =>
      expect(screen.getByText(/Tara is praised/)).toBeInTheDocument(),
    );
    expect(mockStream.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        segmentId: "seg1",
        question: "Who is praised?",
        history: [],
      }),
    );
    expect(screen.getByText("Who is praised?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /segment_chat.citation/ }),
    ).toHaveTextContent("2");
    expect(screen.getByText("A Commentary")).toBeInTheDocument();
    expect(screen.getByText(/segment_chat.other_sources/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("text.translation.open_text")[0]);
    expect(addChapter).toHaveBeenCalledWith(
      { textId: "c1", segmentId: "s2" },
      { id: "chapter1" },
    );
  });

  test("sends earlier turns as history with a follow-up question", async () => {
    mockStream.mockImplementation(async (_request, callbacks) => {
      callbacks.onSources({
        segment: { segment_id: "seg1", content: "verse", text: null },
        sources: [],
      });
      callbacks.onDelta("First answer");
      callbacks.onDone({ cited_refs: [] });
    });
    renderView();

    askQuestion("First?");
    await waitFor(() =>
      expect(screen.getByText("First answer")).toBeInTheDocument(),
    );
    askQuestion("Second?");

    await waitFor(() => expect(mockStream).toHaveBeenCalledTimes(2));
    expect(mockStream.mock.calls[1][0].history).toEqual([
      { role: "user", content: "First?" },
      { role: "assistant", content: "First answer" },
    ]);
  });

  test("shows a friendly message for rate limiting", async () => {
    mockStream.mockImplementation(async (_request, callbacks) => {
      callbacks.onError(new SegmentChatError("Too many", 429));
    });
    renderView();

    askQuestion("Q?");

    await waitFor(() =>
      expect(
        screen.getByText("segment_chat.error.rate_limited"),
      ).toBeInTheDocument(),
    );
  });

  test("a suggested question is asked directly", async () => {
    mockStream.mockResolvedValue(undefined);
    renderView();

    fireEvent.click(screen.getByText("segment_chat.suggestion.terms"));

    await waitFor(() =>
      expect(mockStream.mock.calls[0][0].question).toBe(
        "segment_chat.suggestion.terms",
      ),
    );
  });

  test("stop aborts the request and marks the answer stopped", async () => {
    let signal: AbortSignal | undefined;
    mockStream.mockImplementation(
      (request) =>
        new Promise<void>((resolve) => {
          signal = request.signal;
          request.signal.addEventListener("abort", () => resolve());
        }),
    );
    renderView();

    askQuestion("Long question?");
    await waitFor(() =>
      expect(
        screen.getByText("segment_chat.gathering_sources"),
      ).toBeInTheDocument(),
    );

    // ChatInput's send button becomes the stop button while loading.
    const form = screen
      .getByPlaceholderText("segment_chat.placeholder")
      .closest("form")!;
    await act(async () => {
      fireEvent.click(form.querySelector("button")!);
    });

    expect(signal?.aborted).toBe(true);
    expect(screen.getByText("segment_chat.stopped")).toBeInTheDocument();
  });

  test("starts a new conversation when another segment is selected", async () => {
    mockStream.mockImplementation(async (_request, callbacks) => {
      callbacks.onDelta("Answer");
      callbacks.onDone({ cited_refs: [] });
    });
    const { rerender, addChapter, handleNavigate, onClose } = renderView();

    askQuestion("Q?");
    await waitFor(() => expect(screen.getByText("Answer")).toBeInTheDocument());

    rerender(
      <SegmentChatView
        segmentId="seg2"
        addChapter={addChapter}
        currentChapter={{ id: "chapter1" }}
        handleNavigate={handleNavigate}
        onClose={onClose}
      />,
    );

    expect(screen.queryByText("Answer")).not.toBeInTheDocument();
    expect(screen.getByText("segment_chat.intro")).toBeInTheDocument();
  });

  test("new chat clears the conversation", async () => {
    mockStream.mockImplementation(async (_request, callbacks) => {
      callbacks.onDelta("Answer");
      callbacks.onDone({ cited_refs: [] });
    });
    renderView();

    askQuestion("Q?");
    await waitFor(() => expect(screen.getByText("Answer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("segment_chat.new_chat"));

    expect(screen.queryByText("Answer")).not.toBeInTheDocument();
  });
});
