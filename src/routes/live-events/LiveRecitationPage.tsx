import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { IoVideocamOffOutline, IoVideocamOutline } from "react-icons/io5";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { mapLanguageCode } from "../../utils/helperFunctions.tsx";
import { fetchEventById } from "./api/eventsApi.ts";
import EventVideo from "./components/EventVideo.tsx";
import LiveRecitationView from "./components/LiveRecitationView.tsx";
import { ICON_BUTTON } from "./components/RecitationSettings.tsx";
import RecitationTopBar from "./components/RecitationTopBar.tsx";
import { useLiveViewerCount } from "./hooks/useLiveViewerCount.ts";
import {
  eventPhase,
  eventTitle,
  eventTitleLanguage,
  formatEventWindow,
  preferredVideo,
} from "./utils/eventUtils.ts";
import {
  loadRecitationTheme,
  recitationThemeStyle,
  saveRecitationTheme,
} from "./utils/recitationTheme.ts";
import type { RecitationTheme } from "./utils/recitationTheme.ts";

/** Keeps the phase honest while the page sits open across a start time. */
const REFRESH_MS = 60_000;

/** Colours come from the theme, set as variables on the page root. */
const STAGE =
  "flex h-[100dvh] flex-col bg-[var(--rt-stage)] text-[var(--rt-ink)] transition-colors duration-500";

/**
 * The live recitation, given the whole screen: the text the room is chanting,
 * kept on the line the operator has it on, under one plain bar.
 *
 * Anyone can follow, signed in or not. The stream is a button in the bar, a
 * tap away on every screen: the page is for the text, and a stream that is
 * merely hidden would still play and spend the reader's data.
 *
 * The event detail page links here, in the same tab: this page holds its own
 * socket, and the detail page's closes as it unmounts, so the reader is never
 * counted into the room twice.
 */
const LiveRecitationPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = mapLanguageCode(storedLanguage);

  // Dark stage or paper, as this reader last chose on this device.
  const [theme, setTheme] = useState<RecitationTheme>(loadRecitationTheme);
  const changeTheme = (next: RecitationTheme) => {
    setTheme(next);
    saveRecitationTheme(next);
  };
  const themeStyle = recitationThemeStyle(theme);

  // Shares the detail page's cache entry, so arriving from it shows the event
  // at once.
  const {
    data: event,
    isLoading,
    error,
  } = useQuery(
    ["event", eventId, apiLanguage],
    () => fetchEventById(eventId as string, apiLanguage),
    { enabled: Boolean(eventId), refetchInterval: REFRESH_MS },
  );

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const phase = event ? eventPhase(event, now) : null;
  const isLive = phase === "live";
  const live = useLiveViewerCount(event?.id, isLive);

  // Shut until the reader asks for it.
  const [videoOpen, setVideoOpen] = useState(false);

  const backTo = `/live/${eventId}`;

  const plainBar = (title: string, titleLanguage?: string) => (
    <RecitationTopBar
      backTo={backTo}
      backLabel={t("live_events.back_to_event")}
      title={title}
      titleLanguage={titleLanguage}
    />
  );

  if (isLoading) {
    return (
      <main className={STAGE} style={themeStyle}>
        {plainBar(t("live_events.recitation_page_title"))}
        <div className="mx-auto mt-10 w-full max-w-3xl space-y-4 px-6">
          <div className="h-6 w-1/2 animate-pulse rounded bg-[var(--rt-panel)]" />
          <div className="h-5 w-full animate-pulse rounded bg-[var(--rt-panel)]" />
          <div className="h-5 w-5/6 animate-pulse rounded bg-[var(--rt-panel)]" />
          <div className="h-5 w-4/6 animate-pulse rounded bg-[var(--rt-panel)]" />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className={STAGE} style={themeStyle}>
        {plainBar(t("live_events.recitation_page_title"))}
        <p className="mx-auto mt-16 max-w-md px-6 text-center text-sm text-[var(--rt-soft)]">
          {t("live_events.detail_failed")}
        </p>
      </main>
    );
  }

  const title = eventTitle(event, apiLanguage) || t("live_events.untitled");
  const titleLanguage = eventTitleLanguage(event, apiLanguage);
  const hasVideo = preferredVideo(event, apiLanguage) !== null;

  const seo = (
    <Seo
      title={`${t("live_events.recitation_page_title")} · ${title} | ${siteName}`}
      description={t("live_events.recitation_cta_body")}
      canonical=""
    />
  );

  if (!isLive) {
    return (
      <main className={STAGE} style={themeStyle}>
        {seo}
        {plainBar(title, titleLanguage)}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]">
            {t("live_events.recitation_heading")}
          </p>
          <p className="mt-3 max-w-md text-base leading-7">
            {phase === "past"
              ? t("live_events.recitation_over")
              : t("live_events.recitation_not_live")}
          </p>
          {phase === "upcoming" && (
            <p className="mt-1 text-sm text-[var(--rt-soft)]">
              {formatEventWindow(event, storedLanguage)}
            </p>
          )}
          <Link
            to={backTo}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--rt-soft)] transition hover:text-[var(--rt-ink)]"
          >
            <span aria-hidden>&larr;</span>
            {t("live_events.back_to_event")}
          </Link>
        </div>
      </main>
    );
  }

  const streamLabel = videoOpen
    ? t("live_events.hide_stream")
    : t("live_events.show_stream");

  const streamToggle = hasVideo ? (
    <button
      type="button"
      onClick={() => setVideoOpen(!videoOpen)}
      aria-expanded={videoOpen}
      aria-label={streamLabel}
      title={streamLabel}
      className={ICON_BUTTON}
    >
      {videoOpen ? (
        <IoVideocamOffOutline className="size-[18px]" aria-hidden />
      ) : (
        <IoVideocamOutline className="size-[18px]" aria-hidden />
      )}
    </button>
  ) : null;

  const stream =
    hasVideo && videoOpen ? (
      <aside className="shrink-0 border-b border-[var(--rt-line)] p-3 md:w-[22rem] md:overflow-y-auto md:border-b-0 md:border-r md:p-4 lg:w-[24rem] [&_figure]:rounded-xl [&_figure]:shadow-none [&_figure]:ring-1 [&_figure]:ring-[var(--rt-line)]">
        <EventVideo event={event} language={apiLanguage} isLive />
      </aside>
    ) : null;

  return (
    <main style={themeStyle} className={STAGE}>
      {seo}
      <LiveRecitationView
        live={live}
        language={apiLanguage}
        collectionId={event.group_recitation_collection_id}
        theme={theme}
        onThemeChange={changeTheme}
        title={title}
        titleLanguage={titleLanguage}
        backTo={backTo}
        actions={streamToggle}
        aside={stream}
      />
    </main>
  );
};

export default LiveRecitationPage;
