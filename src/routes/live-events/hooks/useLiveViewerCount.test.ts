import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN } from "../../../utils/constants.ts";
import {
  liveRecitationSocketUrl,
  useLiveViewerCount,
} from "./useLiveViewerCount.ts";

class FakeSocket {
  static latest: FakeSocket | null = null;
  static opened = 0;

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeSocket.latest = this;
    FakeSocket.opened += 1;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

const sessionInfo = (count: number) =>
  JSON.stringify({
    type: "session_info",
    event_id: "event-1",
    is_operator: false,
    count,
  });

describe("liveRecitationSocketUrl", () => {
  it("connects through our own origin, which already proxies /api", () => {
    expect(
      liveRecitationSocketUrl("event-1", "tok en", "https://webuddhist.com"),
    ).toBe(
      "wss://webuddhist.com/api/v1/events/event-1/recitation/live?token=tok%20en",
    );
  });

  it("uses ws:// on a plain-http origin", () => {
    expect(
      liveRecitationSocketUrl("event-1", "t", "http://localhost:5173"),
    ).toBe("ws://localhost:5173/api/v1/events/event-1/recitation/live?token=t");
  });

  it("encodes the event id", () => {
    expect(liveRecitationSocketUrl("a/b", "t", "https://x.test")).toContain(
      "/events/a%2Fb/recitation/live",
    );
  });
});

describe("useLiveViewerCount", () => {
  beforeEach(() => {
    FakeSocket.latest = null;
    FakeSocket.opened = 0;
    sessionStorage.setItem(ACCESS_TOKEN, "app-token");
    vi.stubGlobal("WebSocket", FakeSocket);
  });

  afterEach(() => {
    sessionStorage.removeItem(ACCESS_TOKEN);
    vi.unstubAllGlobals();
  });

  it("shows the count the server reports, then keeps it current", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onmessage?.({ data: sessionInfo(4) });
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.count).toBe(4);

    act(() => {
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({ type: "presence", count: 7 }),
      });
    });

    expect(result.current.count).toBe(7);
  });

  it("stays off the socket when disabled", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1", false));

    expect(FakeSocket.latest).toBeNull();
    expect(result.current.count).toBeNull();
  });

  it("reports signed-out rather than opening a socket without a token", () => {
    sessionStorage.removeItem(ACCESS_TOKEN);

    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    expect(FakeSocket.latest).toBeNull();
    expect(result.current.status).toBe("signed-out");
  });

  it("surfaces the server's reason for refusing, and does not retry it", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({
          type: "error",
          code: "Only joined or following members of this event's group can follow its recitation",
          message:
            "Only joined or following members of this event's group can follow its recitation",
        }),
      });
    });

    expect(result.current.status).toBe("refused");
    expect(result.current.detail).toContain("joined or following members");

    // The refusal is final: the close that follows must not start a retry.
    act(() => {
      FakeSocket.latest?.onclose?.({ code: 1008 });
    });

    expect(FakeSocket.opened).toBe(1);
    expect(result.current.status).toBe("refused");
  });

  it("treats a policy-violation close as refused even with no error frame", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onclose?.({ code: 1008 });
    });

    expect(result.current.status).toBe("refused");
    expect(FakeSocket.opened).toBe(1);
  });

  it("reconnects after an unexpected drop", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useLiveViewerCount("event-1"));

      act(() => {
        FakeSocket.latest?.onmessage?.({ data: sessionInfo(2) });
      });
      act(() => {
        FakeSocket.latest?.onclose?.({ code: 1006 });
      });

      expect(result.current.status).toBe("reconnecting");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(FakeSocket.opened).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reconnects with the current token, not the one the page opened with", () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useLiveViewerCount("event-1"));
      expect(FakeSocket.latest?.url).toContain("token=app-token");

      // The app refreshes this token on a timer; a reconnect has to present
      // whatever is current rather than the one captured at mount.
      sessionStorage.setItem(ACCESS_TOKEN, "refreshed-token");

      act(() => {
        FakeSocket.latest?.onclose?.({ code: 1006 });
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(FakeSocket.opened).toBe(2);
      expect(FakeSocket.latest?.url).toContain("token=refreshed-token");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not reconnect on a credential the reader has signed out of", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useLiveViewerCount("event-1"));
      expect(FakeSocket.opened).toBe(1);

      sessionStorage.removeItem(ACCESS_TOKEN);

      act(() => {
        FakeSocket.latest?.onclose?.({ code: 1006 });
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(FakeSocket.opened).toBe(1);
      expect(result.current.status).toBe("signed-out");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the line the operator has the room on", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    expect(result.current.position).toBeNull();

    act(() => {
      FakeSocket.latest?.onmessage?.({ data: sessionInfo(2) });
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({
          type: "position",
          text_id: "text-1",
          segment_id: "seg-3",
          index: 2,
          round_number: 3,
          revision: 10,
        }),
      });
    });

    expect(result.current.position).toEqual({
      text_id: "text-1",
      segment_id: "seg-3",
      index: 2,
      round_number: 3,
      revision: 10,
    });
    expect(result.current.count).toBe(2);
  });

  it("drops a position older than the one it already has", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));
    const position = (segment: string, revision: number) =>
      JSON.stringify({
        type: "position",
        text_id: "text-1",
        segment_id: segment,
        revision,
      });

    act(() => {
      FakeSocket.latest?.onmessage?.({ data: position("seg-5", 5) });
      FakeSocket.latest?.onmessage?.({ data: position("seg-4", 4) });
    });

    expect(result.current.position?.segment_id).toBe("seg-5");
  });

  it("ignores a position with no segment to find", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({ type: "position", text_id: "text-1" }),
      });
    });

    expect(result.current.position).toBeNull();
  });

  it("clears the position when the operator ends the session", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({
          type: "position",
          text_id: "text-1",
          segment_id: "seg-1",
          revision: 7,
        }),
      });
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({ type: "session_ended", event_id: "event-1" }),
      });
    });

    expect(result.current.position).toBeNull();
    expect(result.current.sessionEnded).toBe(true);

    // A session begun again may number its positions afresh.
    act(() => {
      FakeSocket.latest?.onmessage?.({
        data: JSON.stringify({
          type: "position",
          text_id: "text-1",
          segment_id: "seg-1",
          revision: 1,
        }),
      });
    });

    expect(result.current.position?.revision).toBe(1);
    expect(result.current.sessionEnded).toBe(false);
  });

  it("ignores a malformed frame instead of throwing", () => {
    const { result } = renderHook(() => useLiveViewerCount("event-1"));

    act(() => {
      FakeSocket.latest?.onmessage?.({ data: "not json" });
      FakeSocket.latest?.onmessage?.({ data: JSON.stringify(["nope"]) });
    });

    expect(result.current.count).toBeNull();
  });

  it("closes the socket when the page goes away", () => {
    const { unmount } = renderHook(() => useLiveViewerCount("event-1"));
    const socket = FakeSocket.latest;

    unmount();

    expect(socket?.closed).toBe(true);
  });
});
