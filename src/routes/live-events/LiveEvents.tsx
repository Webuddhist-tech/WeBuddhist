import { useEffect, useMemo, useState } from "react";
import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import SectionHeading from "../../components/SectionHeading.tsx";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { mapLanguageCode } from "../../utils/helperFunctions.tsx";
import { fetchFeaturedEvents } from "./api/eventsApi.ts";
import LiveEventCard from "./components/LiveEventCard.tsx";
import { eventPhase, sortByPhaseThenTime } from "./utils/eventUtils.ts";

/** Long enough not to hammer the API, short enough that a puja starting is noticed. */
const REFRESH_MS = 60_000;

const CardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5">
    <div className="aspect-[16/10] animate-pulse bg-slate-100" />
    <div className="space-y-3 p-5">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
  </div>
);

const LiveEvents = () => {
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = mapLanguageCode(storedLanguage);

  const { data, isLoading, error } = useQuery(
    ["featured-events", apiLanguage],
    () => fetchFeaturedEvents(apiLanguage),
    {
      refetchOnWindowFocus: true,
      // Re-sorting on an interval is what moves an event from Upcoming into
      // Live now without the reader reloading the page.
      refetchInterval: REFRESH_MS,
    },
  );

  // Which band an event falls into is a function of the clock as much as of the
  // payload. A refetch that returns identical data keeps the same `data`
  // reference through react-query's structural sharing, so keying the split on
  // `data` alone would leave an event that has just started sitting under
  // "Coming up" until something else happens to change the response.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const { live, upcoming, past } = useMemo(() => {
    const events = sortByPhaseThenTime(data ?? [], now);
    return {
      live: events.filter((event) => eventPhase(event, now) === "live"),
      upcoming: events.filter((event) => eventPhase(event, now) === "upcoming"),
      past: events.filter((event) => eventPhase(event, now) === "past"),
    };
  }, [data, now]);

  // react-query types `error` as `unknown`, which is not renderable on its own.
  const hasError = Boolean(error);

  const bands = [
    { key: "live", heading: t("live_events.band_live"), events: live },
    {
      key: "upcoming",
      heading: t("live_events.band_upcoming"),
      events: upcoming,
    },
    { key: "past", heading: t("live_events.band_past"), events: past },
  ].filter((band) => band.events.length > 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Seo
        title={`${t("live_events.title")} | ${siteName}`}
        description={t("live_events.subtitle")}
        canonical=""
      />

      <SectionHeading
        eyebrow={t("live_events.eyebrow")}
        title={t("live_events.title")}
        description={t("live_events.subtitle")}
      />

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      )}

      {!isLoading && hasError && (
        <p className="rounded-3xl bg-rose-50 px-6 py-8 text-center text-sm text-rose-800">
          {t("live_events.load_failed")}
        </p>
      )}

      {!isLoading && !hasError && bands.length === 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50 to-slate-50 px-6 py-16 text-center">
          <p className="text-lg font-medium text-[#102544]">
            {t("live_events.empty_title")}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t("live_events.empty_body")}
          </p>
        </div>
      )}

      {!isLoading &&
        !hasError &&
        bands.map((band) => (
          <section key={band.key} className="mt-12 first:mt-8">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {band.heading}
            </h2>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {band.events.map((event) => (
                <LiveEventCard
                  key={`${event.id}-${event.occurrence_date ?? ""}`}
                  event={event}
                  language={apiLanguage}
                  locale={storedLanguage}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
};

export default LiveEvents;
