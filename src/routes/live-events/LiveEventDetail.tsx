import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import {
  getLanguageClass,
  mapLanguageCode,
} from "../../utils/helperFunctions.tsx";
import { fetchEventById } from "./api/eventsApi.ts";
import EventDescriptionMarkdown from "./components/EventDescriptionMarkdown.tsx";
import EventVideo from "./components/EventVideo.tsx";
import LivePill from "./components/LivePill.tsx";
import LiveViewerCount from "./components/LiveViewerCount.tsx";
import {
  eventDescription,
  eventImageUrl,
  eventPhase,
  eventTitle,
  eventTitleLanguage,
  formatEventWindow,
  locationLabel,
  safeExternalUrl,
} from "./utils/eventUtils.ts";

/** Keeps the phase honest while the page sits open across a start time. */
const REFRESH_MS = 60_000;

const DetailSkeleton = () => (
  <div className="space-y-6">
    <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
    <div className="aspect-video w-full animate-pulse rounded-3xl bg-slate-100" />
    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
  </div>
);

const LiveEventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = mapLanguageCode(storedLanguage);

  const {
    data: event,
    isLoading,
    error,
  } = useQuery(
    ["event", eventId, apiLanguage],
    () => fetchEventById(eventId as string, apiLanguage),
    { enabled: Boolean(eventId), refetchInterval: REFRESH_MS },
  );

  // A refetch that returns identical data keeps the same `data` reference, so
  // the render that would move this event from "upcoming" to "live" never
  // happens on the response alone - the clock has to be its own input.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const backLink = (
    <Link
      to="/live"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-[#102544]"
    >
      <span aria-hidden>&larr;</span>
      {t("live_events.back_to_list")}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {backLink}
        <div className="mt-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {backLink}
        <p className="mt-8 rounded-3xl bg-rose-50 px-6 py-10 text-center text-sm text-rose-800">
          {t("live_events.detail_failed")}
        </p>
      </div>
    );
  }

  const title = eventTitle(event, apiLanguage) || t("live_events.untitled");
  const description = eventDescription(event, apiLanguage);
  const phase = eventPhase(event, now);
  const isLive = phase === "live";
  const where = locationLabel(event);
  const imageUrl = eventImageUrl(event);
  const hasVideo = (event.youtube?.length ?? 0) > 0;
  const titleFontClass = getLanguageClass(
    eventTitleLanguage(event, apiLanguage),
  );
  // Organizer-supplied links. Anything that is not an absolute http(s) URL is
  // dropped rather than offered as a clickable unknown scheme.
  const otherLinks = (event.links ?? []).flatMap((link) => {
    const href = safeExternalUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Seo
        title={`${title} | ${siteName}`}
        description={description || t("live_events.subtitle")}
        canonical=""
      />

      {backLink}

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          {isLive && <LivePill />}
          {phase === "past" && (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
              {t("live_events.ended")}
            </span>
          )}
          {event.group_name && (
            <span className="flex items-center gap-2 text-sm text-slate-500">
              {event.group_avatar_url && (
                <img
                  src={event.group_avatar_url}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              {event.group_name}
            </span>
          )}
        </div>

        <h1
          className={`mt-4 text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-[#102544] sm:text-4xl ${titleFontClass}`}
        >
          {title}
        </h1>

        {/* The live count sits with the title, where a stream page puts it. It
            only opens a socket while the event is actually running. */}
        <div className="mt-5">
          <LiveViewerCount eventId={event.id} enabled={isLive} />
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0 space-y-8">
          {hasVideo ? (
            <EventVideo event={event} language={apiLanguage} isLive={isLive} />
          ) : (
            imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="w-full rounded-3xl object-cover"
              />
            )
          )}

          {description && (
            <section
              aria-labelledby="live-event-about-heading"
              className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-900/5 sm:p-8"
            >
              <h2
                id="live-event-about-heading"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                {t("live_events.about")}
              </h2>
              <div className="mt-4">
                <EventDescriptionMarkdown content={description} />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <dl className="space-y-4 rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-900/5">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("live_events.when")}
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {formatEventWindow(event, storedLanguage)}
              </dd>
              {event.timezone && (
                <dd className="mt-0.5 text-xs text-slate-500">
                  {event.timezone}
                </dd>
              )}
            </div>

            {where && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("live_events.where")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">{where}</dd>
              </div>
            )}

            {event.event_format && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("live_events.format")}
                </dt>
                <dd className="mt-1 text-sm capitalize text-slate-800">
                  {event.event_format}
                </dd>
              </div>
            )}

            {typeof event.participant_count === "number" && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("live_events.joined")}
                </dt>
                <dd className="mt-1 text-sm text-slate-800">
                  {t("live_events.participants", {
                    count: event.participant_count,
                  })}
                </dd>
              </div>
            )}
          </dl>

          {otherLinks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("live_events.links")}
              </h2>
              <ul className="space-y-2">
                {otherLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block truncate text-sm text-[#1b3a67] underline decoration-slate-300 underline-offset-4 transition hover:decoration-[#1b3a67]"
                    >
                      {link.label?.trim() || link.href}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default LiveEventDetail;
