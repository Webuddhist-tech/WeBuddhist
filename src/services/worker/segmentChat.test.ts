import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SEGMENT_CHAT_STREAM_URL, streamSegmentChat } from "./segmentChat";

const streamResponse = (chunks: string[], init: ResponseInit = {}) => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(body, { status: 200, ...init });
};

const sse = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

describe("streamSegmentChat", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  test("posts the question and dispatches events, including ones split across chunks", async () => {
    const sourcesEvent = sse("sources", {
      segment: { segment_id: "seg1", content: "verse", text: null },
      sources: [
        { ref: 1, type: "commentary", segment_id: "s1", text_id: "t1" },
      ],
    });
    fetchMock.mockResolvedValue(
      streamResponse([
        sourcesEvent.slice(0, 20),
        sourcesEvent.slice(20) + sse("delta", { text: "Hello " }),
        sse("delta", { text: "world [1]" }) + sse("done", { cited_refs: [1] }),
      ]),
    );
    const callbacks = {
      onSources: vi.fn(),
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    };

    await streamSegmentChat(
      {
        segmentId: "seg1",
        question: "Why?",
        history: [{ role: "user", content: "Hi" }],
      },
      callbacks,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SEGMENT_CHAT_STREAM_URL);
    expect(JSON.parse(init.body)).toEqual({
      segment_id: "seg1",
      question: "Why?",
      history: [{ role: "user", content: "Hi" }],
    });
    expect(callbacks.onSources).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [expect.objectContaining({ ref: 1 })],
      }),
    );
    expect(callbacks.onDelta.mock.calls.map(([text]) => text)).toEqual([
      "Hello ",
      "world [1]",
    ]);
    expect(callbacks.onDone).toHaveBeenCalledWith({ cited_refs: [1] });
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  test("sends language only when given", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([sse("done", { cited_refs: [] })]),
    );
    await streamSegmentChat(
      { segmentId: "seg1", question: "Q", language: "bo" },
      {},
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe("bo");
  });

  test("reports HTTP errors with their status and detail", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Too many questions." }), {
        status: 429,
      }),
    );
    const onError = vi.fn();

    await streamSegmentChat({ segmentId: "seg1", question: "Q" }, { onError });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 429, message: "Too many questions." }),
    );
  });

  test("reports an error event from the stream", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        sse("delta", { text: "part" }),
        sse("error", { message: "boom" }),
      ]),
    );
    const onError = vi.fn();

    await streamSegmentChat({ segmentId: "seg1", question: "Q" }, { onError });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 0, message: "boom" }),
    );
  });

  test("reports a stream that ends without done", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([sse("delta", { text: "part" })]),
    );
    const onError = vi.fn();

    await streamSegmentChat({ segmentId: "seg1", question: "Q" }, { onError });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  test("ignores malformed events", async () => {
    fetchMock.mockResolvedValue(
      streamResponse([
        "event: delta\ndata: {not json\n\n",
        sse("done", { cited_refs: [] }),
      ]),
    );
    const onDelta = vi.fn();
    const onError = vi.fn();

    await streamSegmentChat(
      { segmentId: "seg1", question: "Q" },
      { onDelta, onError },
    );

    expect(onDelta).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  test("stays quiet when aborted", async () => {
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));
    const onError = vi.fn();

    await streamSegmentChat({ segmentId: "seg1", question: "Q" }, { onError });

    expect(onError).not.toHaveBeenCalled();
  });

  test("reports network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const onError = vi.fn();

    await streamSegmentChat({ segmentId: "seg1", question: "Q" }, { onError });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 0, message: "Failed to fetch" }),
    );
  });
});
