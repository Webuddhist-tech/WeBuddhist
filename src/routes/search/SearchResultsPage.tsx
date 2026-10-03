import {
  useCallback,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTolgee, useTranslate } from "@tolgee/react";
import { GiPrayerBeads } from "react-icons/gi";
import {
  IoBookOutline,
  IoCalendarClearOutline,
  IoChevronDown,
  IoDocumentTextOutline,
  IoPeopleOutline,
  IoRadioOutline,
} from "react-icons/io5";
import Seo from "../commons/seo/Seo.tsx";
import DownloadAppModal from "../../components/DownloadAppModal.tsx";
import {
  isMobileDevice,
  openAppDownloadPage,
} from "../../utils/deviceUtils.ts";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import {
  apiLanguageParam,
  tolgeeToPlanLanguage,
} from "../planviewer/utils/seriesUtils.ts";
import Sources from "./sources/Sources";
import TextResults from "./results/TextResults.tsx";
import PlanResults from "./results/PlanResults.tsx";
import MantraResults from "./results/MantraResults.tsx";
import GroupResults from "./results/GroupResults.tsx";
import EventResults from "./results/EventResults.tsx";
import { PREVIEW_COUNT } from "./results/ResultParts.tsx";
import {
  useEventResults,
  useGroupResults,
  useMantraResults,
  usePlanResults,
  useTextResults,
  useVerseCount,
} from "./results/useSearchResults.ts";

type Category = {
  key: "texts" | "verses" | "plans" | "mantras" | "groups" | "events";
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Null while unknown; a string like "20+" when only a floor is known. */
  count: number | string | null;
  isLoading: boolean;
  render: (preview: boolean) => ReactNode;
};

const hasResults = (category: Category) =>
  category.count !== null && category.count !== 0;

/**
 * Search across everything the site holds - texts, verses, plans, mantras,
 * groups and live events - as one page of sections, one per kind of
 * result. A section with nothing in it is left out; the rest open on a few
 * results and expand in place.
 */
const SearchResultsPage = () => {
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const language = apiLanguageParam(storedLanguage);
  const planLanguage = tolgeeToPlanLanguage(storedLanguage);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const handleOpenApp = useCallback(() => {
    if (isMobileDevice()) {
      openAppDownloadPage();
      return;
    }
    setDownloadModalOpen(true);
  }, []);

  const texts = useTextResults(query);
  const verses = useVerseCount(query);
  const plans = usePlanResults(query, language);
  const mantras = useMantraResults(query, language);
  const groups = useGroupResults(query, language);
  const events = useEventResults(query, language);

  const categories: Category[] = [
    {
      key: "texts",
      label: t("search_page.texts", "Texts"),
      icon: IoBookOutline,
      // The library can say there are more, but not how many.
      count: texts.isLoading
        ? null
        : texts.hasMore
          ? `${texts.items.length}+`
          : texts.items.length,
      isLoading: texts.isLoading,
      render: (preview) => (
        <TextResults results={texts} query={query} preview={preview} />
      ),
    },
    {
      key: "verses",
      label: t("search_page.verses", "Verses"),
      icon: IoDocumentTextOutline,
      count: verses.total,
      isLoading: verses.isLoading,
      render: (preview) => <Sources query={query} preview={preview} />,
    },
    {
      key: "plans",
      label: t("header.plans", "Plans"),
      icon: IoCalendarClearOutline,
      count: plans.isLoading ? null : (plans.total ?? 0),
      isLoading: plans.isLoading,
      render: (preview) => (
        <PlanResults
          results={plans}
          query={query}
          language={language}
          preview={preview}
        />
      ),
    },
    {
      key: "mantras",
      label: t("search_page.mantras", "Mantras"),
      icon: GiPrayerBeads,
      count: mantras.isLoading ? null : (mantras.total ?? 0),
      isLoading: mantras.isLoading,
      render: (preview) => (
        <MantraResults
          results={mantras}
          query={query}
          planLanguage={planLanguage}
          onOpenApp={handleOpenApp}
          preview={preview}
        />
      ),
    },
    {
      key: "groups",
      label: t("home.practice_spaces", "Practice spaces"),
      icon: IoPeopleOutline,
      count: groups.isLoading ? null : (groups.total ?? 0),
      isLoading: groups.isLoading,
      render: (preview) => (
        <GroupResults
          results={groups}
          query={query}
          planLanguage={planLanguage}
          preview={preview}
        />
      ),
    },
    {
      key: "events",
      label: t("header.live", "Live"),
      icon: IoRadioOutline,
      count: events.isLoading ? null : events.total,
      isLoading: events.isLoading,
      render: (preview) => (
        <EventResults
          results={events}
          query={query}
          language={language}
          locale={storedLanguage}
          preview={preview}
        />
      ),
    },
  ];

  const stillLoading = categories.some((category) => category.isLoading);
  const shown = categories.filter(
    (category) => category.isLoading || hasResults(category),
  );

  return (
    <div className="overalltext mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Seo
        title={`${query} — ${t("search_page.title", "Search results")} — ${siteName}`}
        description={t("search_page.title", "Search results")}
        canonical={`${window.location.origin}/search`}
      />
      <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {t("search_page.title", "Search results")}
      </h1>
      {query && (
        <p className="mt-2 text-faded-grey">
          {t("search_page.results_for_query", "for “{query}”", { query })}
        </p>
      )}

      <div className="mt-8">
        {!query ? (
          <p className="text-faded-grey">
            {t("search_page.empty_query", "Type something to search for.")}
          </p>
        ) : (
          <div className="space-y-12">
            {/* Keyed by the query too, so a new search starts every section
                afresh - collapsed, and the verse list back on its first page.
                Carried over, page 2 of the last search became page 2 of
                this one, which can be empty while the count says otherwise. */}
            {shown.map((category) => (
              <ResultSection
                key={`${category.key}:${query}`}
                category={category}
              />
            ))}
            {!stillLoading && shown.length === 0 && (
              <p className="rounded-xl border border-dashed border-custom-border p-8 text-center text-faded-grey">
                {t("search_page.nothing_found", "Nothing matched “{query}”.", {
                  query,
                })}
              </p>
            )}
          </div>
        )}
      </div>
      <DownloadAppModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </div>
  );
};

/**
 * One kind of result: a few to start with, and the whole list - with its own
 * "Show more" for further pages - once asked for.
 */
const ResultSection = ({ category }: { category: Category }) => {
  const { t } = useTranslate();
  const [expanded, setExpanded] = useState(false);
  const canExpand =
    typeof category.count === "string" ||
    (typeof category.count === "number" && category.count > PREVIEW_COUNT);

  return (
    <section aria-labelledby={`results-${category.key}`}>
      <h2
        id={`results-${category.key}`}
        className="mb-4 flex items-center gap-2.5 text-xl font-semibold text-primary"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-rose-600 text-white">
          <category.icon className="size-4" />
        </span>
        {category.label}
        {category.count !== null && (
          <span className="rounded-full bg-search-background px-2 text-sm font-medium text-faded-grey">
            {category.count}
          </span>
        )}
      </h2>
      {category.render(!expanded)}
      {!expanded && canExpand && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t("search_page.show_all", "Show all {label}", {
            label: category.label.toLowerCase(),
          })}
          <IoChevronDown className="size-4" />
        </button>
      )}
    </section>
  );
};

export default SearchResultsPage;
