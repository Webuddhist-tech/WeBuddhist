import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { IoShareOutline } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Seo from "../commons/seo/Seo.tsx";
import { fetchVerseOfDayToday } from "../planviewer/api/plansApi.ts";
import type { VerseOfDayPublicDTO } from "../planviewer/types.ts";
import {
  apiLanguageParam,
  getVerseAttribution,
  getVerseText,
} from "../planviewer/utils/seriesUtils.ts";
import { getLanguageClass } from "../../utils/helperFunctions.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { fetchVerseOfDayByDate } from "./api/verseOfDayApi.ts";
import {
  daysEndingOn,
  formatVerseDate,
  splitVerseSource,
  toIsoDate,
} from "./utils/verseOfDay.ts";

/** How many earlier days the "this week" list reaches back. */
const WEEK_LENGTH = 7;

const QUERY_OPTIONS = { refetchOnWindowFocus: false, staleTime: 5 * 60_000 };

type ParsedVerse = {
  body: string;
  source: string;
  attribution: string;
};

const parseVerse = (
  verse: VerseOfDayPublicDTO | null | undefined,
  lang: string,
): ParsedVerse | null => {
  if (!verse) return null;
  const text = getVerseText(verse.verses, verse.verse, lang);
  if (!text) return null;
  return {
    ...splitVerseSource(text),
    attribution: getVerseAttribution(verse.group_info, lang),
  };
};

/**
 * The verse of the day on a page of its own: today's verse with its image,
 * and the rest of the past week's verses beneath it.
 *
 * `?date=YYYY-MM-DD` shows an earlier day's verse in the main card instead;
 * the week list links there, and drops whichever day is already on show.
 */
const VerseOfTheDayPage = () => {
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const [searchParams] = useSearchParams();
  const apiLanguage = apiLanguageParam(
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en",
  );
  const verseClass = cn(
    getLanguageClass(apiLanguage),
    getLanguageClass(apiLanguage) !== "bo-text" && "en-serif-text",
  );

  // Same key as the home hero's verse note, so the two share one request.
  const todayQuery = useQuery(
    ["verse-of-day", apiLanguage],
    () => fetchVerseOfDayToday(apiLanguage),
    QUERY_OPTIONS,
  );
  // The server decides which day "today" is; fall back to the local date
  // until it has answered, or if nothing is published today.
  const today = todayQuery.data?.verse_of_day?.date ?? toIsoDate(new Date());
  const requestedDate = searchParams.get("date");
  const selectedDate =
    requestedDate && requestedDate !== today ? requestedDate : null;

  const selectedQuery = useQuery(
    ["verse-of-day", apiLanguage, selectedDate],
    () => fetchVerseOfDayByDate(selectedDate as string, apiLanguage),
    { ...QUERY_OPTIONS, enabled: Boolean(selectedDate) },
  );
  const featuredQuery = selectedDate ? selectedQuery : todayQuery;
  const featuredDate = selectedDate ?? today;

  const weekDates = daysEndingOn(today, WEEK_LENGTH)
    .filter((date) => date !== featuredDate)
    .slice(0, WEEK_LENGTH - 1);
  const weekQueries = useQueries(
    weekDates.map((date) => ({
      queryKey: ["verse-of-day", apiLanguage, date],
      // Today comes from the endpoint the rest of the site already uses.
      queryFn: () =>
        date === today
          ? fetchVerseOfDayToday(apiLanguage)
          : fetchVerseOfDayByDate(date, apiLanguage),
      ...QUERY_OPTIONS,
    })),
  );

  const featuredVerse = featuredQuery.data?.verse_of_day;
  const featured = parseVerse(featuredVerse, apiLanguage);
  const title = t("plans.verse_of_day", "Verse of the day");

  return (
    <div className="overalltext mx-auto w-full max-w-xl px-4 py-8 sm:py-10">
      <Seo
        title={`${title} — ${siteName}`}
        description={featured?.body ?? title}
        canonical={`${window.location.origin}/verse-of-the-day`}
      />

      <article className="rounded-2xl border border-custom-border bg-background p-5 shadow-sm sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              {title}
            </h1>
            <p className="mt-1 text-sm text-faded-grey">
              {formatVerseDate(featuredDate)}
            </p>
          </div>
          {featured && (
            <ShareButton date={featuredDate} verse={featured} title={title} />
          )}
        </header>

        {featuredQuery.isLoading ? (
          <div className="mt-6 animate-pulse space-y-4">
            <div className="aspect-square w-full rounded-xl bg-search-background" />
            <div className="h-4 w-full rounded-full bg-search-background" />
            <div className="h-4 w-2/3 rounded-full bg-search-background" />
          </div>
        ) : featured ? (
          <>
            {featuredVerse?.image_url && (
              <img
                src={featuredVerse.image_url}
                alt={featured.body}
                className="mt-6 aspect-square w-full rounded-xl object-cover"
              />
            )}
            <blockquote className="mt-6 border-l-2 border-primary pl-4">
              <p
                className={cn(
                  "text-lg leading-relaxed text-primary",
                  verseClass,
                )}
              >
                “{featured.body}”
              </p>
              <VerseReference verse={featured} className="mt-3" />
            </blockquote>
          </>
        ) : (
          <p className="mt-6 text-sm text-faded-grey">
            {t("verse_of_day.none", "No verse was published for this day.")}
          </p>
        )}

        {selectedDate && (
          <Link
            to="/verse-of-the-day"
            className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("verse_of_day.back_to_today", "Back to today's verse")}
          </Link>
        )}
      </article>

      <section aria-labelledby="this-week-heading" className="mt-10">
        <h2
          id="this-week-heading"
          className="text-xl font-semibold tracking-tight text-primary"
        >
          {t("verse_of_day.this_week", "This week's verses")}
        </h2>
        <ol className="mt-4 divide-y divide-custom-border">
          {weekDates.map((date, index) => {
            const query = weekQueries[index];
            if (query?.isLoading) {
              return (
                <li key={date} className="animate-pulse space-y-2 py-5">
                  <div className="h-3 w-28 rounded-full bg-search-background" />
                  <div className="h-4 w-full rounded-full bg-search-background" />
                  <div className="h-4 w-3/4 rounded-full bg-search-background" />
                </li>
              );
            }
            const verse = parseVerse(query?.data?.verse_of_day, apiLanguage);
            if (!verse) return null;
            return (
              <li key={date}>
                <Link
                  to={
                    date === today
                      ? "/verse-of-the-day"
                      : `/verse-of-the-day?date=${date}`
                  }
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="group block py-5"
                >
                  <p className="text-xs font-medium text-faded-grey">
                    {formatVerseDate(date)}
                  </p>
                  <p
                    className={cn(
                      "mt-2 leading-relaxed text-primary group-hover:underline group-hover:decoration-custom-border group-hover:underline-offset-4",
                      verseClass,
                    )}
                  >
                    {verse.body}
                  </p>
                  <VerseReference verse={verse} className="mt-2" />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
};

/** The source in small capitals, then who the verse is attributed to. */
const VerseReference = ({
  verse,
  className,
}: {
  verse: ParsedVerse;
  className?: string;
}) => {
  if (!verse.source && !verse.attribution) return null;
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-faded-grey",
        className,
      )}
    >
      {[verse.source, verse.attribution].filter(Boolean).join(" · ")}
    </p>
  );
};

/**
 * Hands the verse and a link back to this day to the device's share sheet,
 * or copies them where there is none (most desktop browsers).
 */
const ShareButton = ({
  date,
  verse,
  title,
}: {
  date: string;
  verse: ParsedVerse;
  title: string;
}) => {
  const { t } = useTranslate();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/verse-of-the-day?date=${date}`;
    const text = verse.source
      ? `“${verse.body}” — ${verse.source}`
      : verse.body;
    if (navigator.share) {
      // Dismissing the share sheet rejects; nothing to recover from.
      await navigator.share({ title, text, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; fail silently.
    }
  };

  return (
    <Button onClick={handleShare} className="shrink-0 rounded-full" size="sm">
      <IoShareOutline />
      <span aria-live="polite">
        {copied
          ? t("plans.copied", "Copied!")
          : t("verse_of_day.share", "Share")}
      </span>
    </Button>
  );
};

export default VerseOfTheDayPage;
