import { useEffect, useState } from "react";
import { useAuth } from "../../../config/AuthContext.tsx";
import { ACCESS_TOKEN } from "../../../utils/constants.ts";

export type LiveViewerStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "refused"
  | "signed-out";

export interface LiveViewerCount {
  /** People joined to the event socket, including this page once it is in. */
  count: number | null;
  status: LiveViewerStatus;
  /**
   * Why the socket turned this page away, in the server's own words. Following
   * a recitation is limited to members of the event's group, and that refusal
   * is something the reader can act on - so it is shown rather than flattened
   * into a generic failure.
   */
  detail: string | null;
  /** The server's machine-readable reason, e.g. `UNAUTHORIZED`. */
  code: string | null;
}

const PING_INTERVAL_MS = 30_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * The live socket is served under `/api`, which this origin already proxies to
 * the backend, so it is reached on our own host rather than through a second
 * base URL. That keeps it same-origin and means the dev proxy and nginx cover
 * it with the rules they already apply to the API.
 */
export const liveRecitationSocketUrl = (
  eventId: string,
  token: string,
  origin: string = window.location.origin,
): string => {
  const wsBase = origin.replace(/\/$/, "").replace(/^http/i, "ws");
  return `${wsBase}/api/v1/events/${encodeURIComponent(eventId)}/recitation/live?token=${encodeURIComponent(token)}`;
};

const readNumber = (frame: unknown, key: string): number | null => {
  if (typeof frame !== "object" || frame === null || !(key in frame))
    return null;
  const value = (frame as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
};

const readString = (frame: unknown, key: string): string | null => {
  if (typeof frame !== "object" || frame === null || !(key in frame))
    return null;
  const value = (frame as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
};

/**
 * Joins an event's live recitation socket and keeps the room size it reports.
 *
 * The server sends `count` on `session_info` when this page joins, and again as
 * `presence` whenever anyone joins or leaves. This page is one of the people in
 * that number for as long as it stays open, which is why the UI says so.
 *
 * Pass `enabled: false` to stay off the socket - the count is only worth a
 * connection once the reader is actually looking at the event.
 *
 * The socket is tied to the reader's session: signing in on an open page opens
 * one, and signing out closes it rather than leaving it running on a credential
 * the reader has given up.
 */
export const useLiveViewerCount = (
  eventId: string | undefined,
  enabled = true,
): LiveViewerCount => {
  // Auth lives in session storage, which cannot be subscribed to. These are the
  // flags the app flips on login and logout, and they are what tells this hook
  // that the credential behind an open socket has changed.
  const { isLoggedIn, isTokenReady } = useAuth() as {
    isLoggedIn?: boolean;
    isTokenReady?: boolean;
  };
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<LiveViewerStatus>("connecting");
  const [detail, setDetail] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !eventId) return;

    let stopped = false;
    let giveUp = false;
    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let delay = 1000;

    const stopPing = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const connect = () => {
      if (stopped || giveUp) return;

      // Read on every attempt rather than once: the app refreshes this token on
      // a timer, and a reconnect an hour into a puja must not present the one
      // that was current when the page opened.
      const token = sessionStorage.getItem(ACCESS_TOKEN);
      if (!token) {
        setCount(null);
        setStatus("signed-out");
        setDetail(null);
        setCode(null);
        return;
      }

      setStatus((current) =>
        current === "connected" || current === "reconnecting"
          ? "reconnecting"
          : "connecting",
      );
      const next = new WebSocket(liveRecitationSocketUrl(eventId, token));
      socket = next;

      next.onopen = () => {
        if (stopped || socket !== next) return;
        delay = 1000;
        pingTimer = setInterval(() => {
          if (next.readyState === WebSocket.OPEN) {
            next.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL_MS);
      };

      next.onmessage = (event) => {
        if (stopped || socket !== next) return;
        let frame: unknown;
        try {
          frame = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const frameType = readString(frame, "type");
        if (frameType === "session_info" || frameType === "presence") {
          const joined = readNumber(frame, "count");
          if (joined !== null) setCount(joined);
          setStatus("connected");
          setDetail(null);
          setCode(null);
          return;
        }
        if (frameType === "error") {
          // The server has stated its reason and will close; retrying would
          // only reproduce it.
          giveUp = true;
          setDetail(readString(frame, "message"));
          setCode(readString(frame, "code"));
          setStatus("refused");
        }
      };

      next.onclose = (event) => {
        if (stopped || socket !== next) return;
        stopPing();
        if (giveUp || event.code === 1008) {
          setStatus("refused");
          return;
        }
        setStatus("reconnecting");
        retryTimer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, MAX_RECONNECT_MS);
      };
    };

    connect();

    return () => {
      stopped = true;
      stopPing();
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [eventId, enabled, isLoggedIn, isTokenReady]);

  return { count, status, detail, code };
};
