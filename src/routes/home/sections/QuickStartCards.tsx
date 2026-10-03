import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { cn } from "@/lib/utils";
import { fetchVerseOfDayToday } from "../../planviewer/api/plansApi.ts";
import { getVerseText } from "../../planviewer/utils/seriesUtils.ts";
import { splitVerseSource } from "../../verse-of-the-day/utils/verseOfDay.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import {
  PANEL_CLASS,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
} from "../components/HomeSection.tsx";

/**
 * The two doors in under the hero: start reading the library, or read
 * today's verse - quoted here so the card is worth stopping at by itself.
 */
const QuickStartCards = ({ apiLanguage }: { apiLanguage: string }) => {
  const { t } = useTranslate();
  const { data, isLoading } = useQuery(
    ["verse-of-day", apiLanguage],
    () => fetchVerseOfDayToday(apiLanguage),
    { refetchOnWindowFocus: false },
  );
  const verse = data?.verse_of_day;
  const verseText = verse
    ? getVerseText(verse.verses, verse.verse, apiLanguage)
    : "";
  const { body, source } = splitVerseSource(verseText);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={cn(PANEL_CLASS, "flex flex-col p-8 sm:p-10")}>
        <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          {t("home.read_title", "Read the texts")}
        </h2>
        <p className="mt-3 text-primary/80">
          {t(
            "home.read_body",
            "The Buddhist canon and its commentaries, in your language.",
          )}
        </p>
        <div className="mt-auto flex flex-wrap gap-3 pt-6">
          <Link to="/collections" className={PRIMARY_ACTION}>
            {t("home.start_reading", "Start reading")}
          </Link>
          <Link to="/plans" className={SECONDARY_ACTION}>
            {t("home.browse_practices", "Browse practices")}
          </Link>
        </div>
      </div>

      <div className={cn(PANEL_CLASS, "flex flex-col p-8 sm:p-10")}>
        <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          {t("home.todays_verse", "Today's verse")}
        </h2>
        {isLoading ? (
          <div className="mt-4 animate-pulse space-y-2">
            <div className="h-4 w-full rounded-full bg-stone-200" />
            <div className="h-4 w-3/4 rounded-full bg-stone-200" />
          </div>
        ) : body ? (
          <figure className="mt-3">
            <blockquote
              className={cn(
                "line-clamp-3 leading-relaxed text-primary/80",
                getLanguageClass(apiLanguage),
                getLanguageClass(apiLanguage) !== "bo-text" &&
                  "en-serif-text text-lg",
              )}
            >
              “{body}”
            </blockquote>
            {source && (
              <figcaption className="mt-2 text-xs font-semibold uppercase tracking-wider text-faded-grey">
                {source}
              </figcaption>
            )}
          </figure>
        ) : (
          <p className="mt-3 text-primary/80">
            {t(
              "home.verse_body",
              "A line of the Dharma to carry through the day.",
            )}
          </p>
        )}
        <div className="mt-auto pt-6">
          <Link to="/verse-of-the-day" className={PRIMARY_ACTION}>
            {t("home.read_now", "Read now")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuickStartCards;
