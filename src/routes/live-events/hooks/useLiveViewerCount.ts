import { useEffect, useState } from "react";
import { useAuth } from "../../../config/AuthContext.tsx";
import { ACCESS_TOKEN } from "../../../utils/constants.ts";
import type { LiveRecitationPosition } from "../types.ts";

export type LiveViewerStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "refused";

export interface LiveViewerCount {
  /** People joined to the event socket, including this page once it is in. */
  count: number | null;
  status: LiveViewerStatus;
  /**
   * Why the socket turned this page away, in the server's own words - an
   * event that is gone, or not yet published - so it is shown rather than
   * flattened into a generic failure.
   */
  detail: string | null;
  /** The server's machine-readable reason, e.g. `UNAUTHORIZED`. */
  code: string | null;
  /**
   * The line the operator has the room on, or null before one is set. Arrives
   * on connect when a puja is already under way, so a late joiner lands on it.
   */
  position: LiveRecitationPosition | null;
  /** The operator ended the recitation; cleared by the next position. */
  sessionEnded: boolean;
}

const PING_INTERVAL_MS = 30_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * The live socket is served under `/api`, which this origin already proxies to
 * the backend, so it is reached on our own host rather than through a second
 * base URL. That keeps it same-origin and means the dev proxy and nginx cover
 * it with the rules they already apply to the API.
 *
 * Without a token the reader joins as a guest: following a puja needs no
 * account.
 */
export const liveRecitationSocketUrl = (
  eventId: string,
  token: string | null,
  origin: string = window.location.origin,
): string => {
  const wsBase = origin.replace(/\/$/, "").replace(/^http/i, "ws");
  const url = `${wsBase}/api/v1/events/${encodeURIComponent(eventId)}/recitation/live`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
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

const readPosition = (frame: unknown): LiveRecitationPosition | null => {
  const textId = readString(frame, "text_id");
  const segmentId = readString(frame, "segment_id");
  if (!textId || !segmentId) return null;
  return {
    text_id: textId,
    segment_id: segmentId,
    index: readNumber(frame, "index"),
    round_number: readNumber(frame, "round_number"),
    revision: readNumber(frame, "revision"),
  };
};

/**
 * Joins an event's live recitation socket and keeps the room size it reports,
 * along with the line the operator has the room on.
 *
 * The server sends `count` on `session_info` when this page joins, and again as
 * `presence` whenever anyone joins or leaves. This page is one of the people in
 * that number for as long as it stays open, which is why the UI says so.
 *
 * One socket serves both: a second one for the text would count this reader
 * into the room twice.
 *
 * Pass `enabled: false` to stay off the socket - the count is only worth a
 * connection once the reader is actually looking at the event.
 *
 * Anyone may follow, signed in or not. A signed-in reader joins as themselves
 * and anyone else as a guest; signing in or out on an open page reconnects as
 * the other, rather than leave a socket running on a credential the reader has
 * given up. A token the server will not take - one that expired before the app
 * could refresh it - is dropped and the reader joins as a guest instead.
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
  const [position, setPosition] = useState<LiveRecitationPosition | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    if (!enabled || !eventId) return;

    // Another event's position must not be shown against this one's text.
    setPosition(null);
    setSessionEnded(false);

    let stopped = false;
    let giveUp = false;
    // Set once the server turns down the reader's token: from then on this
    // page joins as a guest, and the next close reconnects at once.
    let asGuest = false;
    let rejoinAsGuest = false;
    let socket: WebSocket | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let delay = 1000;
    // Frames on one socket are ordered by revision. A new socket starts over:
    // a session ended and begun again may number its positions afresh.
    let lastRevision: number | null = null;

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
      const token = asGuest ? null : sessionStorage.getItem(ACCESS_TOKEN);

      setStatus((current) =>
        current === "connected" || current === "reconnecting"
          ? "reconnecting"
          : "connecting",
      );
      lastRevision = null;
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
        if (frameType === "position") {
          const moved = readPosition(frame);
          if (!moved) return;
          if (
            moved.revision != null &&
            lastRevision !== null &&
            moved.revision <= lastRevision
          )
            return;
          if (moved.revision != null) lastRevision = moved.revision;
          setPosition(moved);
          setSessionEnded(false);
          return;
        }
        if (frameType === "session_ended") {
          lastRevision = null;
          setPosition(null);
          setSessionEnded(true);
          return;
        }
        if (frameType === "error") {
          // A token the server will not take costs the reader nothing: they
          // can follow as a guest, and do, as soon as this socket closes.
          if (token && readString(frame, "code") === "UNAUTHORIZED") {
            asGuest = true;
            rejoinAsGuest = true;
            return;
          }
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
        if (rejoinAsGuest) {
          rejoinAsGuest = false;
          connect();
          return;
        }
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

  return { count, status, detail, code, position, sessionEnded };
};
