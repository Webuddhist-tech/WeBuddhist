import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import {
  getLanguageClass,
  mapLanguageCode,
} from "../../utils/helperFunctions.tsx";
import { fetchEventById } from "./api/eventsApi.ts";
import EventVideo from "./components/EventVideo.tsx";
import LivePill from "./components/LivePill.tsx";
import LiveRecitationView from "./components/LiveRecitationView.tsx";
import LiveViewerCount from "./components/LiveViewerCount.tsx";
import { useLiveViewerCount } from "./hooks/useLiveViewerCount.ts";
import { groupPathById } from "../groups/utils/groupHandle.ts";
import {
  eventPhase,
  eventTitle,
  eventTitleLanguage,
  formatEventWindow,
  preferredVideo,
} from "./utils/eventUtils.ts";

/** Keeps the phase honest while the page sits open across a start time. */
const REFRESH_MS = 60_000;

const STAGE = "flex h-[100dvh] flex-col bg-black text-[#f2f2f7]";

/**
 * The live recitation, given the whole screen: the text the room is chanting,
 * kept on the line the operator has it on, with the stream beside it.
 *
 * Laid out after the operator's own screen - the event and its stream down the
 * side where the operator keeps the sections, the liturgy in paper layout
 * filling the rest - so what the umdze sees and what the room reads look like
 * one thing.
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
  const isMobile = useIsMobile();

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

  // On a phone the text is the point, and the stream is a tap away: a stream
  // that is merely hidden would still play, and spend the reader's data.
  const [videoOpen, setVideoOpen] = useState(false);

  const backToEvent = (
    <Link
      to={`/live/${eventId}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8e8e93] transition hover:text-white"
    >
      <span aria-hidden>&larr;</span>
      {t("live_events.back_to_event")}
    </Link>
  );

  const brand = (
    <div className="flex items-center justify-between gap-4 border-b border-[#2c2c2e] pb-4">
      <Link to="/" className="shrink-0">
        <img
          src="/img/dark_mode_logo.svg"
          alt={siteName}
          className="h-6 w-auto md:h-7"
        />
      </Link>
      {backToEvent}
    </div>
  );

  if (isLoading) {
    return (
      <main className={STAGE}>
        <div className="px-4 py-4 md:px-6">{brand}</div>
        <div className="mx-auto mt-10 w-full max-w-3xl space-y-4 px-6">
          <div className="h-6 w-1/2 animate-pulse rounded bg-[#1c1c1e]" />
          <div className="h-5 w-full animate-pulse rounded bg-[#1c1c1e]" />
          <div className="h-5 w-5/6 animate-pulse rounded bg-[#1c1c1e]" />
          <div className="h-5 w-4/6 animate-pulse rounded bg-[#1c1c1e]" />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className={STAGE}>
        <div className="px-4 py-4 md:px-6">{brand}</div>
        <p className="mx-auto mt-16 max-w-md px-6 text-center text-sm text-[#e08585]">
          {t("live_events.detail_failed")}
        </p>
      </main>
    );
  }

  const title = eventTitle(event, apiLanguage) || t("live_events.untitled");
  const hasVideo = preferredVideo(event, apiLanguage) !== null;
  const showVideo = isLive && hasVideo && (!isMobile || videoOpen);

  return (
    <main
      className={`${STAGE} md:grid md:grid-cols-[22rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[24rem_minmax(0,1fr)]`}
    >
      <Seo
        title={`${t("live_events.recitation_page_title")} · ${title} | ${siteName}`}
        description={t("live_events.recitation_cta_body")}
        canonical=""
      />

      <aside className="shrink-0 border-b border-[#2c2c2e] px-4 pb-4 pt-4 md:overflow-y-auto md:border-b-0 md:border-r md:px-5 md:pt-5">
        {brand}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isLive && <LivePill />}
          {phase === "past" && (
            <span className="rounded-full bg-[#2c2c2e] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#8e8e93]">
              {t("live_events.ended")}
            </span>
          )}
          {event.group_name && (
            <Link
              to={groupPathById(event.group_id)}
              className="min-w-0 truncate text-xs font-medium uppercase tracking-[0.11em] text-[#8e8e93] transition hover:text-white"
            >
              {event.group_name}
            </Link>
          )}
        </div>

        <h1
          className={`mt-3 text-lg font-semibold leading-snug md:text-xl ${getLanguageClass(eventTitleLanguage(event, apiLanguage))}`}
        >
          {title}
        </h1>

        {isLive && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LiveViewerCount live={live} tone="dark" />
            {live.status === "signed-out" && (
              <Link
                to="/login"
                className="rounded-full bg-[#e5231c] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#ff3a33]"
              >
                {t("live_events.sign_in")}
              </Link>
            )}
          </div>
        )}

        {isLive && hasVideo && isMobile && (
          <button
            type="button"
            onClick={() => setVideoOpen((open) => !open)}
            aria-expanded={videoOpen}
            className="mt-3 rounded-full bg-[#2c2c2e] px-4 py-1.5 text-sm font-semibold text-[#f2f2f7] transition hover:bg-[#3a3a3c]"
          >
            {videoOpen
              ? t("live_events.hide_stream")
              : t("live_events.show_stream")}
          </button>
        )}

        {showVideo && (
          <div className="mt-4 [&_figure]:rounded-xl [&_figure]:shadow-none [&_figure]:ring-1 [&_figure]:ring-white/10">
            <EventVideo event={event} language={apiLanguage} isLive />
          </div>
        )}
      </aside>

      <section className="flex min-h-0 flex-1 flex-col">
        {isLive ? (
          <LiveRecitationView live={live} language={apiLanguage} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8e8e93]">
              {t("live_events.recitation_heading")}
            </p>
            <p className="mt-3 max-w-md text-base leading-7">
              {phase === "past"
                ? t("live_events.recitation_over")
                : t("live_events.recitation_not_live")}
            </p>
            {phase === "upcoming" && (
              <p className="mt-1 text-sm text-[#8e8e93]">
                {formatEventWindow(event, storedLanguage)}
              </p>
            )}
            <div className="mt-6">{backToEvent}</div>
          </div>
        )}
      </section>
    </main>
  );
};

export default LiveRecitationPage;
