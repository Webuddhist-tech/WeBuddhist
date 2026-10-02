import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveViewerCount } from "../hooks/useLiveViewerCount.ts";
import type { LiveRecitationPosition, LiveRecitationText } from "../types.ts";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

// The shared setup stubs react-query out; this view is tested against the real
// cache, since keeping the old text on screen through a load is its job.
vi.mock("react-query", async () => vi.importActual("react-query"));

const fetchRecitationTextMock = vi.fn();
const fetchEventLiturgiesMock = vi.fn();
vi.mock("../api/eventsApi.ts", () => ({
  fetchRecitationText: (textId: string, language: string) =>
    fetchRecitationTextMock(textId, language),
  fetchEventLiturgies: (collectionId: string) =>
    fetchEventLiturgiesMock(collectionId),
}));

const outlineMock = vi.fn();
vi.mock("@/services/library/tableOfContents.ts", () => ({
  getTableOfContentsOutline: (textId: string, language?: string) =>
    outlineMock(textId, language),
}));

// The glide is its own unit, tested on its own; here it is only asked for.
const smoothScrollMock = vi.fn();
vi.mock("../utils/smoothScroll.ts", () => ({
  smoothScrollTo: (element: HTMLElement, top: number) =>
    smoothScrollMock(element, top),
}));

import LiveRecitationView from "./LiveRecitationView.tsx";

const liturgy = (
  textId: string,
  lines: string[],
  title = textId,
): LiveRecitationText => ({
  text_id: textId,
  title,
  language: "bo",
  segments: lines.map((line, index) => ({
    recitation: { bo: { id: `${textId}-bo-${index}`, content: line } },
    translations: {
      en: { id: `${textId}-en-${index}`, content: `${line} (en)` },
    },
  })),
});

const live = (state: Partial<LiveViewerCount> = {}): LiveViewerCount => ({
  count: 3,
  status: "connected",
  detail: null,
  code: null,
  position: null,
  sessionEnded: false,
  ...state,
});

const at = (
  textId: string,
  segmentId: string,
  extra: Partial<LiveRecitationPosition> = {},
): LiveRecitationPosition => ({
  text_id: textId,
  segment_id: segmentId,
  ...extra,
});

const onThemeChange = vi.fn();

const renderView = (
  state: LiveViewerCount,
  { collectionId = null }: { collectionId?: string | null } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  const view = (next: LiveViewerCount) => (
    <QueryClientProvider client={client}>
      <LiveRecitationView
        live={next}
        language="en"
        collectionId={collectionId}
        theme="dark"
        onThemeChange={onThemeChange}
      />
    </QueryClientProvider>
  );
  const result = render(view(state));
  return {
    ...result,
    update: (next: LiveViewerCount) => result.rerender(view(next)),
  };
};

const currentLine = () =>
  document.querySelector('[aria-current="true"]')?.textContent ?? null;

const scroller = () => screen.getByRole("list").parentElement as HTMLElement;

// jsdom lays nothing out, so the scroller is given a size and a place in it.
const scrollTo = (top: number) =>
  Object.defineProperties(scroller(), {
    scrollTop: { configurable: true, value: top },
    clientHeight: { configurable: true, value: 200 },
    scrollHeight: { configurable: true, value: 600 },
  });

describe("LiveRecitationView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    smoothScrollMock.mockReturnValue(() => {});
    outlineMock.mockResolvedValue([]);
    fetchEventLiturgiesMock.mockResolvedValue([]);
  });

  it("waits quietly until the operator sets a line", () => {
    renderView(live());

    expect(
      screen.getByText("live_events.recitation_waiting"),
    ).toBeInTheDocument();
    expect(fetchRecitationTextMock).not.toHaveBeenCalled();
  });

  it("loads the text being recited and scrolls to the live line", async () => {
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["one", "two", "three"], "Tara"),
    );

    renderView(live({ position: at("tara", "tara-bo-1") }));

    await waitFor(() => expect(currentLine()).toContain("two"));
    expect(fetchRecitationTextMock).toHaveBeenCalledWith("tara", "en");
    expect(screen.getByText("Tara")).toBeInTheDocument();
    expect(screen.getByText("two (en)")).toBeInTheDocument();
    expect(smoothScrollMock).toHaveBeenCalled();
  });

  it("lays a verse out by the library's lines, with its yigchung set small", async () => {
    fetchRecitationTextMock.mockResolvedValue({
      ...liturgy("tara", ["one", "two"]),
      annotations: new Map([
        [
          "tara-bo-1",
          {
            lines: [
              [{ text: "first line", yigchung: false }],
              [
                { text: "second line", yigchung: false },
                { text: "three times", yigchung: true },
              ],
            ],
            reference: "1-2",
            type: "verse",
          },
        ],
      ]),
    });

    renderView(live({ position: at("tara", "tara-bo-1") }));

    await waitFor(() => expect(currentLine()).toContain("first line"));
    expect(screen.getByText("second line").closest("p")).not.toBe(
      screen.getByText("first line").closest("p"),
    );
    expect(screen.getByText("three times")).toHaveClass("yigchung");
    expect(screen.getByText("second line")).not.toHaveClass("yigchung");
    expect(
      screen.getByText(
        'live_events.recitation_progress:{"current":2,"total":2} · 1-2',
      ),
    ).toBeInTheDocument();
  });

  it("follows a position given in another language's edition", async () => {
    fetchRecitationTextMock.mockResolvedValue(liturgy("tara", ["one", "two"]));

    renderView(live({ position: at("tara", "tara-en-0") }));

    await waitFor(() => expect(currentLine()).toContain("one"));
  });

  it("loads the next liturgy when the operator moves on to it", async () => {
    fetchRecitationTextMock.mockImplementation(async (textId: string) =>
      textId === "tara"
        ? liturgy("tara", ["tara one", "tara two"])
        : liturgy("heart", ["heart one", "heart two"]),
    );

    const { update } = renderView(live({ position: at("tara", "tara-bo-1") }));
    await waitFor(() => expect(currentLine()).toContain("tara two"));

    update(live({ position: at("heart", "heart-bo-0") }));

    await waitFor(() => expect(currentLine()).toContain("heart one"));
    expect(fetchRecitationTextMock).toHaveBeenCalledTimes(2);
  });

  it("holds its place and says so when the line is not in the text", async () => {
    fetchRecitationTextMock.mockResolvedValue(liturgy("tara", ["one", "two"]));

    const { update } = renderView(live({ position: at("tara", "tara-bo-1") }));
    await waitFor(() => expect(currentLine()).toContain("two"));

    update(live({ position: at("tara", "gone") }));

    expect(
      await screen.findByText("live_events.recitation_out_of_sync"),
    ).toBeInTheDocument();
    expect(currentLine()).toContain("two");
    // The text asked for is the one already loaded; nothing to fetch again.
    expect(fetchRecitationTextMock).toHaveBeenCalledTimes(1);
  });

  it("drops the old text when the next fails, and tries again on the next move", async () => {
    fetchRecitationTextMock.mockImplementation(async (textId: string) => {
      if (textId === "tara") return liturgy("tara", ["tara one", "tara two"]);
      throw new Error("unavailable");
    });

    const { update } = renderView(live({ position: at("tara", "tara-bo-1") }));
    await waitFor(() => expect(currentLine()).toContain("tara two"));

    update(live({ position: at("heart", "heart-bo-0") }));

    expect(
      await screen.findByText("live_events.recitation_load_failed"),
    ).toBeInTheDocument();
    expect(screen.queryByText("tara two")).not.toBeInTheDocument();
    expect(currentLine()).toBeNull();
    // The failure alone does not ask again: tara once, heart and its retry.
    expect(fetchRecitationTextMock).toHaveBeenCalledTimes(3);

    fetchRecitationTextMock.mockResolvedValue(
      liturgy("heart", ["heart one", "heart two"]),
    );
    update(live({ position: at("heart", "heart-bo-1") }));

    await waitFor(() => expect(currentLine()).toContain("heart two"));
    expect(fetchRecitationTextMock).toHaveBeenCalledTimes(4);
  });

  it("lets the reader try a failed text again without bringing back the old one", async () => {
    fetchRecitationTextMock.mockImplementation(async (textId: string) => {
      if (textId === "tara") return liturgy("tara", ["tara one", "tara two"]);
      throw new Error("unavailable");
    });

    const { update } = renderView(live({ position: at("tara", "tara-bo-1") }));
    await waitFor(() => expect(currentLine()).toContain("tara two"));
    update(live({ position: at("heart", "heart-bo-0") }));

    const retry = await screen.findByRole("button", {
      name: "live_events.recitation_retry",
    });
    let arrive: (text: LiveRecitationText) => void = () => {};
    fetchRecitationTextMock.mockImplementation(
      () =>
        new Promise<LiveRecitationText>((resolve) => {
          arrive = resolve;
        }),
    );
    fireEvent.click(retry);

    expect(
      await screen.findByText("live_events.recitation_loading"),
    ).toBeInTheDocument();
    expect(screen.queryByText("tara two")).not.toBeInTheDocument();

    arrive(liturgy("heart", ["heart one", "heart two"]));

    await waitFor(() => expect(currentLine()).toContain("heart one"));
    expect(
      screen.queryByRole("button", { name: "live_events.recitation_retry" }),
    ).not.toBeInTheDocument();
  });

  it("stops following when the reader scrolls away, and offers the way back", async () => {
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["one", "two", "three"]),
    );

    const { update } = renderView(live({ position: at("tara", "tara-bo-0") }));
    await waitFor(() => expect(currentLine()).toContain("one"));

    scrollTo(0);
    fireEvent.wheel(scroller(), { deltaY: 100 });
    smoothScrollMock.mockClear();

    update(live({ position: at("tara", "tara-bo-1") }));
    await waitFor(() => expect(currentLine()).toContain("two"));
    expect(smoothScrollMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.recitation_resync" }),
    );

    expect(smoothScrollMock).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "live_events.recitation_resync" }),
    ).not.toBeInTheDocument();
  });

  it("keeps following when the reader pushes against either end of the text", async () => {
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["one", "two", "three"]),
    );

    const { update } = renderView(live({ position: at("tara", "tara-bo-0") }));
    await waitFor(() => expect(currentLine()).toContain("one"));

    scrollTo(400);
    fireEvent.wheel(scroller(), { deltaY: 100 });
    fireEvent.keyDown(scroller(), { key: "End" });
    scrollTo(0);
    fireEvent.wheel(scroller(), { deltaY: -100 });
    fireEvent.keyDown(scroller(), { key: " ", shiftKey: true });
    fireEvent.touchStart(scroller(), { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(scroller(), { touches: [{ clientY: 180 }] });
    smoothScrollMock.mockClear();

    update(live({ position: at("tara", "tara-bo-1") }));

    await waitFor(() => expect(currentLine()).toContain("two"));
    expect(smoothScrollMock).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "live_events.recitation_resync" }),
    ).not.toBeInTheDocument();
  });

  it("stops following when the reader drags the text along", async () => {
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["one", "two", "three"]),
    );

    renderView(live({ position: at("tara", "tara-bo-0") }));
    await waitFor(() => expect(currentLine()).toContain("one"));

    scrollTo(0);
    fireEvent.touchStart(scroller(), { touches: [{ clientY: 180 }] });
    fireEvent.touchMove(scroller(), { touches: [{ clientY: 100 }] });

    expect(
      screen.getByRole("button", { name: "live_events.recitation_resync" }),
    ).toBeInTheDocument();
  });

  it("shows the round during a repeated passage", async () => {
    fetchRecitationTextMock.mockResolvedValue(liturgy("tara", ["one"]));

    renderView(
      live({ position: at("tara", "tara-bo-0", { round_number: 4 }) }),
    );

    expect(
      await screen.findByText('live_events.recitation_round:{"round":4}'),
    ).toBeInTheDocument();
  });

  it("says when the recitation has ended", () => {
    renderView(live({ sessionEnded: true }));

    expect(
      screen.getByText("live_events.recitation_ended"),
    ).toBeInTheDocument();
  });

  it("asks a signed-out reader to sign in", () => {
    renderView(live({ status: "signed-out", count: null }));

    expect(
      screen.getByText("live_events.recitation_sign_in"),
    ).toBeInTheDocument();
  });

  it("passes on the server's reason when following is refused", () => {
    renderView(live({ status: "refused", detail: "Only members can follow" }));

    expect(screen.getByText("Only members can follow")).toBeInTheDocument();
  });

  it("glides the text on to the live line", async () => {
    fetchRecitationTextMock.mockResolvedValue(liturgy("tara", ["one", "two"]));

    renderView(live({ position: at("tara", "tara-bo-1") }));

    await waitFor(() => expect(currentLine()).toContain("two"));
    expect(smoothScrollMock).toHaveBeenCalledWith(
      scroller(),
      expect.any(Number),
    );
  });

  it("lists the sections, with short titles, and goes to one when chosen", async () => {
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["one", "two", "three"]),
    );
    outlineMock.mockResolvedValue([
      {
        id: "s1",
        title: "༄༅། །མཚན་དོན་བཞུགས་སོ། །",
        depth: 0,
        segmentId: "tara-bo-0",
      },
      { id: "s2", title: "བསྟོད་པ་དངོས།", depth: 1, segmentId: "tara-bo-2" },
      { id: "s3", title: "Not in this text", depth: 1, segmentId: null },
    ]);

    renderView(live({ position: at("tara", "tara-bo-0") }));
    await waitFor(() => expect(currentLine()).toContain("one"));
    expect(outlineMock).toHaveBeenCalledWith("tara", "bo");

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.recitation_contents" }),
    );

    const current = await screen.findByRole("button", { name: "མཚན་དོན" });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: "Not in this text" }),
    ).toBeDisabled();

    smoothScrollMock.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "བསྟོད་པ་དངོས" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "བསྟོད་པ་དངོས" }),
      ).not.toBeInTheDocument(),
    );
    expect(smoothScrollMock).toHaveBeenCalled();
    // Reading elsewhere: the live line lets go, and offers the way back.
    expect(
      screen.getByRole("button", { name: "live_events.recitation_resync" }),
    ).toBeInTheDocument();
  });

  it("lists the event's liturgies and marks the one the room is on", async () => {
    fetchRecitationTextMock.mockResolvedValue(liturgy("tara", ["one"]));
    fetchEventLiturgiesMock.mockResolvedValue([
      { textId: "refuge", title: "༄༅། །སྐྱབས་འགྲོ།" },
      { textId: "tara", title: "Praises to the Twenty-One Tārās" },
    ]);

    renderView(live({ position: at("tara", "tara-bo-0") }), {
      collectionId: "collection-1",
    });
    await waitFor(() => expect(currentLine()).toContain("one"));

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.recitation_contents" }),
    );

    expect(
      await screen.findByText("Praises to the Twenty-One Tārās"),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("སྐྱབས་འགྲོ")).not.toHaveAttribute("aria-current");
    expect(fetchEventLiturgiesMock).toHaveBeenCalledWith("collection-1");
  });

  it("switches between the dark stage and paper from the settings", () => {
    renderView(live());

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.recitation_settings" }),
    );
    expect(
      screen.getByRole("radio", { name: "live_events.recitation_theme_dark" }),
    ).toHaveAttribute("aria-checked", "true");

    fireEvent.click(
      screen.getByRole("radio", { name: "live_events.recitation_theme_light" }),
    );

    expect(onThemeChange).toHaveBeenCalledWith("light");
  });

  it("glows down the live line at the pace the room kept over the line before", async () => {
    let now = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
    fetchRecitationTextMock.mockResolvedValue(
      liturgy("tara", ["abcd", "efgh<br>ijkl"]),
    );

    const { update } = renderView(live({ position: at("tara", "tara-bo-0") }));
    await waitFor(() => expect(currentLine()).toContain("abcd"));
    // Nothing to go by yet: the whole live line glows, with nothing timed.
    expect(document.querySelector("[data-glow]")).toBeNull();

    // Four characters in two seconds: half a second each.
    now = 2000;
    update(live({ position: at("tara", "tara-bo-1") }));

    await waitFor(() =>
      expect(document.querySelectorAll("[data-glow]")).toHaveLength(2),
    );
    const [first, last] = document.querySelectorAll<HTMLElement>("[data-glow]");
    // The first line glows from the move, and dims two seconds on...
    expect(first.textContent).toBe("efgh");
    expect(first.style.animation).toContain(
      "recitation-glow-in 400ms ease-out 0ms",
    );
    expect(first.style.animation).toContain(
      "recitation-glow-out 400ms ease-in 2000ms",
    );
    // ...as the last lights up, and holds until the next move.
    expect(last.textContent).toBe("ijkl");
    expect(last.style.animation).toContain(
      "recitation-glow-in 400ms ease-out 2000ms",
    );
    expect(last.style.animation).not.toContain("recitation-glow-out");
    clock.mockRestore();
  });
});
