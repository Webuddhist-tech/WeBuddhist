import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import { fetchRecitationText } from "../api/eventsApi.ts";
import type { LiveViewerCount } from "../hooks/useLiveViewerCount.ts";
import type { LiveRecitationText } from "../types.ts";
import { recitationLines } from "../utils/recitationText.ts";

type LiveRecitationViewProps = {
  /** The event's live socket, shared with the viewer count. */
  live: LiveViewerCount;
  /** The reader's language, as the API spells it. */
  language: string;
};

/** Keys a reader uses to move through the text on their own. */
const READING_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The liturgy being recited, kept scrolled to the line the operator has the
 * room on.
 *
 * The socket sends a position, never text. The text is loaded by the position's
 * `text_id` and the line found by its `segment_id`, so when the operator moves
 * on to the next liturgy in the event, the page loads that one and carries on.
 * The text on screen stays until its successor arrives, and a position for it
 * that lands mid-load still finds its line.
 *
 * A reader who scrolls away to read ahead is left there, with a way back to
 * the live line, rather than pulled back on the next move.
 */
const LiveRecitationView = ({ live, language }: LiveRecitationViewProps) => {
  const { t } = useTranslate();
  const { position, status, detail, sessionEnded } = live;

  const [textId, setTextId] = useState<string | null>(null);
  const {
    data: text,
    isFetching,
    isError,
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

  const { lines, lineBySegmentId } = useMemo(
    () => recitationLines(text, language),
    [text, language],
  );

  const matched = position
    ? lineBySegmentId.get(position.segment_id)
    : undefined;

  // A segment the loaded text does not have means the room is on another
  // liturgy - or, if it is this one, that the content has moved on since.
  // Asking for the position's text covers both: the second is a no-op.
  useEffect(() => {
    if (position && matched === undefined) setTextId(position.text_id);
  }, [position, matched]);

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
    scroller.scrollTo({
      top: row.offsetTop - (scroller.clientHeight - row.offsetHeight) / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  // `position` is a dependency even though the line may not change: the
  // operator returning to the same line is still a move worth landing on.
  useEffect(() => {
    if (following) scrollToLine(currentLine);
  }, [currentLine, following, position, scrollToLine]);

  const stopFollowing = () => setFollowing(false);

  const resync = () => {
    setFollowing(true);
    scrollToLine(currentLine);
  };

  if (status === "signed-out" || status === "refused") {
    const message =
      status === "signed-out"
        ? t("live_events.recitation_sign_in")
        : detail || t("live_events.recitation_unavailable");
    return (
      <section className="rounded-3xl bg-slate-50 p-6 text-sm text-slate-600 ring-1 ring-slate-900/5 sm:p-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("live_events.recitation_heading")}
        </h2>
        <p className="mt-3">{message}</p>
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
    if (isError && !isFetching) return t("live_events.recitation_load_failed");
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

  return (
    <section
      aria-labelledby="live-recitation-heading"
      className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/10"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2
            id="live-recitation-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {t("live_events.recitation_heading")}
          </h2>
          {text?.title && (
            <p
              className={`mt-1 truncate text-base font-medium text-[#102544] ${getLanguageClass(text.language)}`}
            >
              {text.title}
            </p>
          )}
        </div>

        {position?.round_number != null && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {t("live_events.recitation_round", {
              round: position.round_number,
            })}
          </span>
        )}

        {currentLine !== null && !following && (
          <button
            type="button"
            onClick={resync}
            className="rounded-full bg-[#102544] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1b3a67]"
          >
            {t("live_events.recitation_resync")}
          </button>
        )}
      </header>

      {notice && (
        <p
          className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-800 sm:px-6"
          role="status"
        >
          {notice}
        </p>
      )}

      <div
        ref={scrollerRef}
        className="relative max-h-[60vh] min-h-[12rem] overflow-y-auto overscroll-contain px-2 py-3 sm:px-3"
        onWheel={stopFollowing}
        onTouchMove={stopFollowing}
        onKeyDown={(event) => {
          if (READING_KEYS.has(event.key)) stopFollowing();
        }}
        tabIndex={0}
        aria-label={t("live_events.recitation_heading")}
      >
        {body ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            {body}
          </p>
        ) : (
          <ol className="space-y-1">
            {lines.map((line, index) => {
              const isCurrent = index === currentLine;
              return (
                <li
                  // Lines have no id of their own that survives a reload, and
                  // the list is replaced whole, never reordered.
                  key={index}
                  data-line={index}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`flex gap-3 rounded-2xl border-l-4 px-3 py-2.5 transition-colors duration-300 ${
                    isCurrent
                      ? "border-amber-400 bg-amber-50"
                      : "border-transparent"
                  }`}
                >
                  <span
                    className="w-7 shrink-0 pt-1 text-right text-[11px] tabular-nums text-slate-400"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`whitespace-pre-line text-[17px] leading-8 ${
                        isCurrent ? "text-[#102544]" : "text-slate-700"
                      } ${getLanguageClass(text?.language)}`}
                    >
                      {line.recited}
                    </p>
                    {line.translation && (
                      <p
                        className={`mt-1 whitespace-pre-line text-sm leading-6 text-slate-500 ${getLanguageClass(language)}`}
                      >
                        {line.translation}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};

export default LiveRecitationView;
