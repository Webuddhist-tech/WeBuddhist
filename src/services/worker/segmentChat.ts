/**
 * Segment AI chat, served by the worker behind the `/worker` proxy.
 * API reference: webuddhist-worker/docs/segment-chat-api.md
 */

export const SEGMENT_CHAT_STREAM_URL = "/worker/segment-chat/stream";

export type SegmentChatSourceType = "root_text" | "translation" | "commentary";

export interface SegmentChatSource {
  ref: number;
  type: SegmentChatSourceType;
  segment_id: string;
  text_id: string;
  title: string;
  language: string | null;
  source_link: string | null;
  license: string | null;
  snippet: string;
}

export interface SegmentChatSegment {
  segment_id: string;
  content: string;
  text: {
    text_id: string | null;
    title: string | null;
    language: string | null;
  } | null;
}

export interface SegmentChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SegmentChatRequest {
  segmentId: string;
  question: string;
  history?: SegmentChatHistoryMessage[];
  language?: string;
  signal?: AbortSignal;
}

export interface SegmentChatCallbacks {
  onSources?: (data: {
    segment: SegmentChatSegment;
    sources: SegmentChatSource[];
  }) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: { cited_refs: number[] }) => void;
  onError?: (error: SegmentChatError) => void;
}

/** `status` is the HTTP status for errors before the stream starts, 0 for a
 * stream that broke part way. */
export class SegmentChatError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SegmentChatError";
    this.status = status;
  }
}

const parseEvent = (raw: string): { event: string; data: any } | null => {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:"))
      dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
};

const readErrorDetail = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    // Not JSON: fall through to the status text.
  }
  return response.statusText || `Request failed with status ${response.status}`;
};

/**
 * POSTs a question and dispatches the server-sent events as they arrive.
 * Resolves when the stream ends; an abort through `signal` resolves quietly.
 */
export const streamSegmentChat = async (
  { segmentId, question, history = [], language, signal }: SegmentChatRequest,
  { onSources, onDelta, onDone, onError }: SegmentChatCallbacks,
): Promise<void> => {
  try {
    const response = await fetch(SEGMENT_CHAT_STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        segment_id: segmentId,
        question,
        history,
        ...(language ? { language } : {}),
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      onError?.(
        new SegmentChatError(await readErrorDetail(response), response.status),
      );
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    const dispatch = (raw: string) => {
      const parsed = parseEvent(raw);
      if (!parsed) return;
      const { event, data } = parsed;
      if (event === "sources") onSources?.(data);
      else if (event === "delta" && typeof data?.text === "string")
        onDelta?.(data.text);
      else if (event === "done") {
        finished = true;
        onDone?.({
          cited_refs: Array.isArray(data?.cited_refs) ? data.cited_refs : [],
        });
      } else if (event === "error") {
        finished = true;
        onError?.(new SegmentChatError(data?.message ?? "Stream error", 0));
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      events.forEach(dispatch);
    }
    if (buffer.trim()) dispatch(buffer);

    if (!finished) {
      onError?.(
        new SegmentChatError(
          "The connection closed before the answer finished.",
          0,
        ),
      );
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return;
    onError?.(
      new SegmentChatError((error as Error)?.message || "Network error", 0),
    );
  }
};
