import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoDocumentTextOutline,
  IoListOutline,
  IoRadioOutline,
} from "react-icons/io5";
import { getLanguageClass } from "@/utils/helperFunctions.tsx";
import { getTableOfContentsOutline } from "@/services/library/tableOfContents.ts";
import { fetchEventLiturgies, fetchRecitationText } from "../api/eventsApi.ts";
import type { LiveViewerCount } from "../hooks/useLiveViewerCount.ts";
import type {
  EventLiturgy,
  LiveRecitationPosition,
  LiveRecitationText,
} from "../types.ts";
import {
  addPaceSample,
  paceOf,
  verseChantedLength,
  verseLineTimings,
} from "../utils/recitationPace.ts";
import { imageForLine } from "../utils/recitationImages.ts";
import { recitationLines } from "../utils/recitationText.ts";
import type { RecitationLine } from "../utils/recitationText.ts";
import type {
  RecitationTheme,
  RecitationView,
} from "../utils/recitationTheme.ts";
import {
  loadRecitationView,
  loadShowTranslation,
  recitationThemeStyle,
  saveRecitationView,
  saveShowTranslation,
} from "../utils/recitationTheme.ts";
import { shortTitle } from "../utils/shortTitle.ts";
import { smoothScrollTo } from "../utils/smoothScroll.ts";
import RecitationMenu from "./RecitationMenu.tsx";
import type { RecitationSection } from "./RecitationMenu.tsx";
import RecitationSettings, {
  ICON_BUTTON,
  RAIL_BUTTON,
  railColor,
  RAIL_LABEL,
} from "./RecitationSettings.tsx";
import RecitationTopBar from "./RecitationTopBar.tsx";
import RecitationVerse from "./RecitationVerse.tsx";

type LiveRecitationViewProps = {
  /** The event's live socket, shared with the viewer count. */
  live: LiveViewerCount;
  /** The reader's language, as the API spells it. */
  language: string;
  /** The event's order of service, when the organizer set one. */
  collectionId?: string | null;
  theme: RecitationTheme;
  onThemeChange: (theme: RecitationTheme) => void;
  /** The event's name, which the top bar shows until a liturgy is under way. */
  title: string;
  titleLanguage?: string;
  /** The event's own page, which the mark in the top bar leads back to. */
  backTo: string;
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
 * Each move glides the text on slowly and lights the live line with a ring
 * that fades as the room settles in. Its text glows line by line as the room
 * chants it, at the pace the room has kept over the lines before.
 *
 * Fills the height the live recitation page gives it, in that page's colours,
 * under a single top bar: what is being recited, whether the room is live, and
 * the few buttons a reader needs.
 */
const LiveRecitationView = ({
  live,
  language,
  collectionId = null,
  theme,
  onThemeChange,
  title,
  titleLanguage,
  backTo,
}: LiveRecitationViewProps) => {
  const { t } = useTranslate();
  const { count, position, status, detail, sessionEnded } = live;

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
  const verseImage =
    currentLine !== null ? imageForLine(lines[currentLine]) : undefined;

  // The room's pace, learned from how long it took over each line it has
  // finished, against how much of the line is chanted. Each move is timed
  // from when it reaches this page; `moves` counts them, so the glow on the
  // live line starts over with each, even a return to the same line.
  const paceSamples = useRef<number[]>([]);
  const lastMove = useRef<{
    position: LiveRecitationPosition;
    text: LiveRecitationText;
    line: number;
    at: number;
  } | null>(null);
  const [msPerCharacter, setMsPerCharacter] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (!position || !text || matched === undefined) return;
    const previous = lastMove.current;
    if (previous?.position === position && previous.text === text) return;

    const now = performance.now();
    if (previous && previous.text === text) {
      const left = lines.slice(previous.line, matched);
      paceSamples.current = addPaceSample(paceSamples.current, {
        elapsedMs: now - previous.at,
        characters: left.reduce(
          (sum, line) => sum + verseChantedLength(line.recited),
          0,
        ),
        lines: matched - previous.line,
      });
      setMsPerCharacter(paceOf(paceSamples.current));
    }
    lastMove.current = { position, text, line: matched, at: now };
    setMoves((count) => count + 1);
  }, [position, text, matched, lines]);

  const paceTimings = useMemo(
    () =>
      msPerCharacter !== null && currentLine !== null && lines[currentLine]
        ? verseLineTimings(lines[currentLine].recited, msPerCharacter)
        : null,
    [msPerCharacter, currentLine, lines],
  );

  // Live: only the line the room is on. Full: the whole text, scrolling with it.
  const [view, setView] = useState<RecitationView>(loadRecitationView);
  const changeView = (next: RecitationView) => {
    setView(next);
    saveRecitationView(next);
    setFollowing(true);
  };

  // The reader's translation under each line, which they may do without.
  const [showTranslation, setShowTranslation] =
    useState<boolean>(loadShowTranslation);
  const changeShowTranslation = (next: boolean) => {
    setShowTranslation(next);
    saveShowTranslation(next);
  };
  const canTranslate = lines.some((line) => line.translation !== null);
  const shown = (line: RecitationLine): RecitationLine =>
    showTranslation ? line : { ...line, translation: null };

  // The rail's buttons can be put away, for a reader who wants the page bare.
  const [railHidden, setRailHidden] = useState(false);
  const railLabel = railHidden
    ? t("live_events.recitation_show_buttons")
    : t("live_events.recitation_hide_buttons");

  const [following, setFollowing] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cancelGlide = useRef<() => void>(() => {});

  useEffect(() => () => cancelGlide.current(), []);

  const scrollToLine = useCallback((line: number | null) => {
    const scroller = scrollerRef.current;
    if (line === null || !scroller) return;
    const row = scroller.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!row) return;
    // The live line sits in the upper third, with what comes next in view
    // below it, as on the operator's screen. A verse too tall for that is
    // centred instead, and one taller than the screen starts at its top.
    const room = scroller.clientHeight;
    const lead = Math.max(
      0,
      Math.min(room * TELEPROMPTER_LEAD, (room - row.offsetHeight) / 2),
    );
    cancelGlide.current();
    cancelGlide.current = smoothScrollTo(scroller, row.offsetTop - lead);
  }, []);

  // `position` is a dependency even though the line may not change: the
  // operator returning to the same line is still a move worth landing on.
  useEffect(() => {
    if (following && view === "full") scrollToLine(currentLine);
  }, [currentLine, following, position, scrollToLine, view]);

  // Following stops only once the reader actually moves the text. A push
  // against either end of it moves nothing, and leaves the live line in charge.
  // A glide under way is let go of either way, so it does not fight the hand.
  const handleReaderScroll = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller || !canScroll(scroller, direction)) return;
    cancelGlide.current();
    setFollowing(false);
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

  // The contents: the event's liturgies, and the outline of the one the room
  // is on, as the live controller lists them.
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: liturgies } = useQuery<EventLiturgy[]>(
    ["live-recitation-liturgies", collectionId],
    () => fetchEventLiturgies(collectionId as string),
    {
      enabled: Boolean(collectionId),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const { data: outline } = useQuery(
    ["live-recitation-outline", textId, text?.language],
    () => getTableOfContentsOutline(textId as string, text?.language),
    {
      enabled: Boolean(textId && text),
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const sections: RecitationSection[] = useMemo(
    () =>
      (outline ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        depth: entry.depth,
        line: entry.segmentId
          ? (lineBySegmentId.get(entry.segmentId) ?? null)
          : null,
      })),
    [outline, lineBySegmentId],
  );

  /** The section being recited: the last that begins at or before the line. */
  const activeSection = useMemo(() => {
    if (currentLine === null) return null;
    const reached = sections.filter(
      (section) => section.line !== null && section.line <= currentLine,
    );
    return reached.length > 0 ? reached[reached.length - 1] : null;
  }, [sections, currentLine]);

  const isCurrentLiturgy = useCallback(
    (liturgy: EventLiturgy) =>
      liturgy.textId === (position?.text_id ?? textId) ||
      liturgy.textId === text?.text_id,
    [position?.text_id, textId, text?.text_id],
  );

  // Going to a section is reading ahead (or back): the live line lets go,
  // and the way back to it is offered as for any other scroll.
  const handleSelectSection = (line: number) => {
    setMenuOpen(false);
    setFollowing(false);
    scrollToLine(line);
  };

  const isConnected = status === "connected";
  const roomSize =
    count === null
      ? null
      : count === 1
        ? t("live_events.watching_one")
        : t("live_events.watching_other", { count });
  const connecting =
    status === "reconnecting"
      ? t("live_events.reconnecting")
      : t("live_events.connecting");

  // Whether the room is live for this page, and how many are in it: red and
  // pulsing while the socket is up, grey while it finds its way in.
  const liveMarker = (
    <span
      role="status"
      title={
        isConnected && roomSize
          ? `${roomSize} ${t("live_events.including_you")}`
          : connecting
      }
      className={`flex items-center gap-1.5 whitespace-nowrap px-1 text-[11px] font-bold uppercase tracking-[0.1em] ${
        isConnected ? "text-[var(--rt-accent)]" : "text-[var(--rt-soft)]"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${
          isConnected
            ? "animate-pulse bg-[var(--rt-accent)]"
            : "bg-[var(--rt-soft)]"
        }`}
      />
      <span className="max-[380px]:sr-only">{t("live_events.live_now")}</span>
      {isConnected && count !== null ? (
        <span className="tabular-nums text-[var(--rt-soft)]">
          <span aria-hidden>· {count}</span>
          <span className="sr-only">{roomSize}</span>
        </span>
      ) : (
        <span className="sr-only">{connecting}</span>
      )}
    </span>
  );

  const refusal =
    status === "refused"
      ? detail || t("live_events.recitation_unavailable")
      : null;

  const outOfSync =
    Boolean(position) &&
    matched === undefined &&
    Boolean(text) &&
    !isFetching &&
    !isError;

  const notice = (() => {
    if (refusal && lines.length > 0) return refusal;
    if (sessionEnded) return t("live_events.recitation_ended");
    if (loadFailed) return t("live_events.recitation_load_failed");
    if (outOfSync) return t("live_events.recitation_out_of_sync");
    return null;
  })();

  const body = (() => {
    if (lines.length > 0) return null;
    if (refusal) return refusal;
    if (textId && (isFetching || !isError))
      return t("live_events.recitation_loading");
    if (!position && !sessionEnded) return t("live_events.recitation_waiting");
    return null;
  })();

  const progress =
    currentLine !== null && lines.length > 0
      ? {
          current: currentLine + 1,
          total: lines.length,
          label: [
            t("live_events.recitation_progress", {
              current: currentLine + 1,
              total: lines.length,
            }),
            lines[currentLine]?.reference,
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : null;

  // The liturgy under way, and the section of it the room is in - or, until
  // one is under way, the event itself.
  const liturgyTitle = text?.title ? shortTitle(text.title) : null;
  const sectionTitle = activeSection ? shortTitle(activeSection.title) : null;

  return (
    <section
      aria-labelledby="live-recitation-title"
      className="flex min-h-0 flex-1 flex-col"
    >
      <RecitationTopBar
        backTo={backTo}
        backLabel={t("live_events.back_to_event")}
        title={liturgyTitle ?? title}
        titleLanguage={liturgyTitle ? text?.language : titleLanguage}
        titleId="live-recitation-title"
        subtitle={liturgyTitle ? (sectionTitle ?? title) : null}
        subtitleLanguage={sectionTitle ? text?.language : titleLanguage}
        progress={progress}
      >
        {liveMarker}
        {/* In the bar beside the live marker on a phone; on a wide screen, a
          rail down the left edge, level with the middle of the text. */}
        <div className="flex items-center gap-2 lg:gap-4 lg:fixed lg:left-4 lg:top-1/2 lg:z-30 lg:-translate-y-1/2 lg:flex-col">
          <button
            type="button"
            onClick={() => setRailHidden(!railHidden)}
            aria-expanded={!railHidden}
            aria-label={railLabel}
            title={railLabel}
            className="hidden size-8 items-center justify-center rounded-full text-[var(--rt-soft)] transition hover:text-[var(--rt-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rt-accent)] lg:flex"
          >
            {railHidden ? (
              <IoChevronForwardOutline className="size-5" aria-hidden />
            ) : (
              <IoChevronBackOutline className="size-5" aria-hidden />
            )}
          </button>
          <div
            className={`flex items-center gap-2 lg:flex-col lg:gap-5 ${railHidden ? "lg:hidden" : ""}`}
          >
            {(
              [
                ["live", "live_events.recitation_view_live", IoRadioOutline],
                [
                  "full",
                  "live_events.recitation_view_full",
                  IoDocumentTextOutline,
                ],
              ] as const
            ).map(([mode, label, Icon]) => (
              <button
                key={mode}
                type="button"
                onClick={() => changeView(mode)}
                aria-pressed={view === mode}
                aria-label={t(label)}
                title={t(label)}
                className={`${ICON_BUTTON} ${RAIL_BUTTON} ${railColor(view === mode)} ${
                  view === mode
                    ? "border-[var(--rt-accent)] bg-[var(--rt-raised)] lg:bg-transparent"
                    : ""
                }`}
              >
                <Icon className="size-[18px] lg:size-4" aria-hidden />
                <span className={RAIL_LABEL}>{t(label)}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label={t("live_events.recitation_contents")}
              title={t("live_events.recitation_contents")}
              className={`${ICON_BUTTON} ${RAIL_BUTTON} ${railColor(menuOpen)}`}
            >
              <IoListOutline className="size-[18px] lg:size-4" aria-hidden />
              <span className={RAIL_LABEL}>
                {t("live_events.recitation_contents")}
              </span>
            </button>
            <RecitationSettings
              theme={theme}
              onThemeChange={onThemeChange}
              canTranslate={canTranslate}
              showTranslation={showTranslation}
              onShowTranslationChange={changeShowTranslation}
            />
          </div>
        </div>
      </RecitationTopBar>

      {notice && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--rt-line)] bg-[var(--rt-notice)] px-5 py-2.5 text-[13px] text-[var(--rt-notice-ink)] sm:px-8">
          <p className="min-w-0 flex-1" role="status">
            {notice}
          </p>
          {loadFailed && !sessionEnded && (
            <button
              type="button"
              onClick={handleRetry}
              className="font-semibold underline underline-offset-2 transition hover:opacity-80"
            >
              {t("live_events.recitation_retry")}
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* The way back floats over the text rather than sitting in the header,
          so the text does not jump as it comes and goes. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {view === "full" && currentLine !== null && !following && (
            <button
              type="button"
              onClick={handleResync}
              className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--rt-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-[var(--rt-accent-hover)]"
            >
              {t("live_events.recitation_resync")}
            </button>
          )}
          {view === "live" ? (
            <div
              aria-label={t("live_events.recitation_heading")}
              className="flex min-h-[16rem] flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6"
            >
              {body || currentLine === null ? (
                <p className="px-4 py-16 text-center text-sm text-[var(--rt-soft)]">
                  {body ?? t("live_events.recitation_waiting")}
                </p>
              ) : (
                <div
                  className={`flex w-full flex-col items-center gap-6 md:flex-row ${
                    verseImage ? "max-w-6xl" : "max-w-3xl"
                  }`}
                >
                  <div className="flex min-w-0 w-full flex-1 flex-col">
                    {verseImage && (
                      <div className="mb-2 flex flex-col items-end text-right text-[var(--rt-soft)]">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {verseImage.label.en}
                        </span>
                        <span className={`text-lg ${getLanguageClass("bo")}`}>
                          {verseImage.label.bo}
                        </span>
                      </div>
                    )}
                    <div className="w-full rounded-3xl border border-[var(--rt-line)] bg-[var(--rt-panel)] px-6 py-8 text-center sm:px-10 sm:py-10">
                      <RecitationVerse
                        line={shown(lines[currentLine])}
                        recitedLanguage={text?.language ?? language}
                        readerLanguage={language}
                        isCurrent
                        paceTimings={paceTimings}
                        paceKey={moves}
                      />
                    </div>
                  </div>
                  {verseImage && (
                    <img
                      src={verseImage.src}
                      alt={verseImage.alt}
                      className="max-h-[70dvh] w-auto max-w-full rounded-2xl border border-[var(--rt-line)] object-contain md:w-[min(34vw,26rem)]"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              ref={scrollerRef}
              className="relative min-h-[16rem] flex-1 overflow-y-auto overscroll-contain px-2 pt-6 outline-none [scrollbar-color:var(--rt-line)_transparent] sm:px-6"
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              aria-label={t("live_events.recitation_heading")}
            >
              {body ? (
                <p className="px-4 py-16 text-center text-sm text-[var(--rt-soft)]">
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
                        className={`relative rounded-xl px-3 py-3 transition-colors duration-1000 ease-in-out sm:px-4 ${
                          isCurrent ? "bg-[var(--rt-live)]" : "bg-transparent"
                        }`}
                      >
                        {/* The live line's edge, fading in and out with it. */}
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute bottom-3.5 left-0 top-3.5 w-[3px] rounded-full bg-gradient-to-b from-[var(--rt-accent)] to-[var(--rt-accent)]/20 transition-opacity duration-500 ${
                            isCurrent ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {/* Remade on every move, so the ring lights up on each. */}
                        {isCurrent && (
                          <span
                            key={moves}
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-xl animate-[recitation-arrive_1.6s_ease-out]"
                          />
                        )}
                        {isCurrent && position?.round_number != null && (
                          <span className="absolute -top-2.5 right-3.5 rounded-full bg-[var(--rt-accent)] px-2.5 py-0.5 text-[11.5px] font-bold tracking-[0.06em] text-white">
                            {t("live_events.recitation_round", {
                              round: position.round_number,
                            })}
                          </span>
                        )}
                        <RecitationVerse
                          line={shown(line)}
                          recitedLanguage={text?.language ?? language}
                          readerLanguage={language}
                          isCurrent={isCurrent}
                          paceTimings={isCurrent ? paceTimings : null}
                          paceKey={moves}
                        />
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      <RecitationMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        themeStyle={recitationThemeStyle(theme)}
        liturgies={liturgies ?? []}
        isCurrentLiturgy={isCurrentLiturgy}
        sections={sections}
        activeSectionId={activeSection?.id ?? null}
        onSelectSection={handleSelectSection}
      />
    </section>
  );
};

export default LiveRecitationView;
