import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import { fetchRecitationText } from "../api/eventsApi.ts";
import type { LiveViewerCount } from "../hooks/useLiveViewerCount.ts";
import type { LiveRecitationPosition, LiveRecitationText } from "../types.ts";
import { recitationLines } from "../utils/recitationText.ts";
import RecitationVerse from "./RecitationVerse.tsx";

type LiveRecitationViewProps = {
  /** The event's live socket, shared with the viewer count. */
  live: LiveViewerCount;
  /** The reader's language, as the API spells it. */
  language: string;
};

/**
 * Keys a reader uses to move through the text on their own, and which way
 * each moves it: up is negative.
 */
const READING_KEYS = new Map([
  ["ArrowUp", -1],
  ["ArrowDown", 1],
  ["PageUp", -1],
  ["PageDown", 1],
  ["Home", -1],
  ["End", 1],
  [" ", 1],
]);

/** How far down the screen the live line is held, as a share of its height. */
const TELEPROMPTER_LEAD = 0.3;

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Whether the text has room to move the way the reader is pushing it. */
const canScroll = (scroller: HTMLElement, direction: number) => {
  if (direction < 0) return scroller.scrollTop > 0;
  if (direction > 0)
    return (
      Math.ceil(scroller.scrollTop) + scroller.clientHeight <
      scroller.scrollHeight
    );
  return false;
};

/**
 * The liturgy being recited, kept scrolled to the line the operator has the
 * room on.
 *
 * The socket sends a position, never text. The text is loaded by the position's
 * `text_id` and the line found by its `segment_id`, so when the operator moves
 * on to the next liturgy in the event, the page loads that one and carries on.
 * The text on screen stays until its successor arrives, and a position for it
 * that lands mid-load still finds its line. A successor that fails to load
 * takes the old text off screen and is tried again on the operator's next
 * move, or when the reader asks.
 *
 * A reader who scrolls away to read ahead is left there, with a way back to
 * the live line, rather than pulled back on the next move.
 *
 * Drawn for the dark stage of the live recitation page, after the operator's
 * own screen, and fills the height that page gives it.
 */
const LiveRecitationView = ({ live, language }: LiveRecitationViewProps) => {
  const { t } = useTranslate();
  const { position, status, detail, sessionEnded } = live;

  const [textId, setTextId] = useState<string | null>(null);
  const {
    data,
    isFetching,
    isError,
    isPreviousData,
    errorUpdateCount,
    refetch,
  } = useQuery<LiveRecitationText>(
    ["live-recitation-text", textId, language],
    () => fetchRecitationText(textId as string, language),
    {
      enabled: Boolean(textId),
      keepPreviousData: true,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  // The old text stays while its successor loads, but not once the successor
  // has failed - not even while it is tried again. The room has moved past
  // it, and its live line would be the wrong one.
  const text = isPreviousData && errorUpdateCount > 0 ? undefined : data;
  const loadFailed = isError && !isFetching;

  const { lines, lineBySegmentId } = useMemo(
    () => recitationLines(text, language),
    [text, language],
  );

  const matched = position
    ? lineBySegmentId.get(position.segment_id)
    : undefined;

  // A segment the loaded text does not have means the room is on another
  // liturgy - or, if it is this one, that the content has moved on since.
  // Asking for the position's text covers both: the second is a no-op. Each
  // move asks once, so a text that failed to load is tried again on the next
  // move rather than left failed for the rest of the event.
  const askedBy = useRef<LiveRecitationPosition | null>(null);
  useEffect(() => {
    if (!position || matched !== undefined || askedBy.current === position)
      return;
    askedBy.current = position;
    if (position.text_id === textId && loadFailed) refetch();
    else setTextId(position.text_id);
  }, [position, matched, textId, loadFailed, refetch]);

  // The last line found, held against the text it was found in, so an
  // unknown segment leaves the reader where they were rather than nowhere.
  const [current, setCurrent] = useState<{
    text: LiveRecitationText;
    line: number;
  } | null>(null);

  useEffect(() => {
    if (text && matched !== undefined) setCurrent({ text, line: matched });
  }, [text, matched]);

  const currentLine = current && current.text === text ? current.line : null;

  const [following, setFollowing] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollToLine = useCallback((line: number | null) => {
    const scroller = scrollerRef.current;
    if (line === null || !scroller) return;
    const row = scroller.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!row || typeof scroller.scrollTo !== "function") return;
    // The live line sits in the upper third, with what comes next in view
    // below it, as on the operator's screen. A verse too tall for that is
    // centred instead, and one taller than the screen starts at its top.
    const room = scroller.clientHeight;
    const lead = Math.max(
      0,
      Math.min(room * TELEPROMPTER_LEAD, (room - row.offsetHeight) / 2),
    );
    scroller.scrollTo({
      top: row.offsetTop - lead,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  // `position` is a dependency even though the line may not change: the
  // operator returning to the same line is still a move worth landing on.
  useEffect(() => {
    if (following) scrollToLine(currentLine);
  }, [currentLine, following, position, scrollToLine]);

  // Following stops only once the reader actually moves the text. A push
  // against either end of it moves nothing, and leaves the live line in charge.
  const handleReaderScroll = (direction: number) => {
    const scroller = scrollerRef.current;
    if (scroller && canScroll(scroller, direction)) setFollowing(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) =>
    handleReaderScroll(Math.sign(event.deltaY));

  const touchY = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchY.current = event.touches[0]?.clientY ?? null;
  };

  // A finger drawn up the screen moves the text down.
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const y = event.touches[0]?.clientY;
    if (y === undefined) return;
    if (touchY.current !== null) handleReaderScroll(touchY.current - y);
    touchY.current = y;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction = READING_KEYS.get(event.key);
    if (direction === undefined) return;
    handleReaderScroll(event.key === " " && event.shiftKey ? -1 : direction);
  };

  const handleResync = () => {
    setFollowing(true);
    scrollToLine(currentLine);
  };

  const handleRetry = () => {
    refetch();
  };

  if (status === "signed-out" || status === "refused") {
    const message =
      status === "signed-out"
        ? t("live_events.recitation_sign_in")
        : detail || t("live_events.recitation_unavailable");
    return (
      <section className="flex min-h-[16rem] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8e8e93]">
          {t("live_events.recitation_heading")}
        </h2>
        <p className="mt-3 max-w-md text-base leading-7 text-[#f2f2f7]">
          {message}
        </p>
      </section>
    );
  }

  const outOfSync =
    Boolean(position) &&
    matched === undefined &&
    Boolean(text) &&
    !isFetching &&
    !isError;

  const notice = (() => {
    if (sessionEnded) return t("live_events.recitation_ended");
    if (loadFailed) return t("live_events.recitation_load_failed");
    if (outOfSync) return t("live_events.recitation_out_of_sync");
    return null;
  })();

  const body = (() => {
    if (lines.length > 0) return null;
    if (textId && (isFetching || !isError))
      return t("live_events.recitation_loading");
    if (!position && !sessionEnded) return t("live_events.recitation_waiting");
    return null;
  })();

  const progress =
    currentLine !== null
      ? [
          t("live_events.recitation_progress", {
            current: currentLine + 1,
            total: lines.length,
          }),
          lines[currentLine]?.reference,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <section
      aria-labelledby="live-recitation-heading"
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="shrink-0 border-b border-[#2c2c2e] px-5 pb-4 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2
            id="live-recitation-heading"
            className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8e8e93]"
          >
            {t("live_events.recitation_heading")}
          </h2>

          {position?.round_number != null && (
            <span className="rounded-full bg-[#e5231c]/20 px-2.5 py-0.5 text-xs font-semibold text-[#ff8a85] ring-1 ring-[#e5231c]/40">
              {t("live_events.recitation_round", {
                round: position.round_number,
              })}
            </span>
          )}
        </div>

        {text?.title && (
          <p
            className={`mt-2 text-xl leading-relaxed text-[#f2f2f7] sm:text-2xl ${getLanguageClass(text.language)}`}
          >
            {text.title}
          </p>
        )}
        {progress && (
          <p className="mt-1 text-[13px] tabular-nums text-[#8e8e93]">
            {progress}
          </p>
        )}
      </header>

      {notice && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#2c2c2e] bg-[#3a2f1a] px-5 py-2.5 text-[13px] text-[#f2c879] sm:px-8">
          <p className="min-w-0 flex-1" role="status">
            {notice}
          </p>
          {loadFailed && !sessionEnded && (
            <button
              type="button"
              onClick={handleRetry}
              className="font-semibold underline underline-offset-2 transition hover:text-white"
            >
              {t("live_events.recitation_retry")}
            </button>
          )}
        </div>
      )}

      {/* The way back floats over the text rather than sitting in the header,
          so the text does not jump as it comes and goes. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {currentLine !== null && !following && (
          <button
            type="button"
            onClick={handleResync}
            className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#e5231c] px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-black/50 transition hover:bg-[#ff3a33]"
          >
            {t("live_events.recitation_resync")}
          </button>
        )}
        <div
          ref={scrollerRef}
          className="relative min-h-[16rem] flex-1 overflow-y-auto overscroll-contain px-2 pt-6 outline-none [scrollbar-color:#2c2c2e_transparent] sm:px-6"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label={t("live_events.recitation_heading")}
        >
          {body ? (
            <p className="px-4 py-16 text-center text-sm text-[#8e8e93]">
              {body}
            </p>
          ) : (
            // The room below the last verse lets it, too, scroll up to where
            // the live line is held.
            <ol className="mx-auto max-w-3xl space-y-2 pb-[45vh]">
              {lines.map((line, index) => {
                const isCurrent = index === currentLine;
                return (
                  <li
                    // Lines have no id of their own that survives a reload, and
                    // the list is replaced whole, never reordered.
                    key={index}
                    data-line={index}
                    aria-current={isCurrent ? "true" : undefined}
                    className={`rounded-xl px-3 py-3 transition-colors duration-300 sm:px-4 ${
                      isCurrent ? "bg-[#e5231c]/25" : ""
                    }`}
                  >
                    <RecitationVerse
                      line={line}
                      recitedLanguage={text?.language ?? language}
                      readerLanguage={language}
                      isCurrent={isCurrent}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

export default LiveRecitationView;
