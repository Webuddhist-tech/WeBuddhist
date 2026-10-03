import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoCalendarClearOutline } from "react-icons/io5";
import { resolveImageUrl } from "../../planviewer/utils/seriesUtils.ts";
import { fetchPlanSummary, type PracticeItem } from "../api/searchApi.ts";
import Highlighted from "./Highlighted.tsx";
import {
  NoResults,
  PREVIEW_COUNT,
  RESULT_CARD,
  ResultSkeleton,
  ShowMore,
  Thumb,
} from "./ResultParts.tsx";
import type { CategoryResults } from "./useSearchResults.ts";

type PlanResultsProps = {
  results: CategoryResults<PracticeItem>;
  query: string;
  language: string;
  preview?: boolean;
};

/**
 * Plan series and single plans, each a card with its artwork on the left,
 * the way a reading-plan app lists them.
 */
const PlanResults = ({
  results,
  query,
  language,
  preview,
}: PlanResultsProps) => {
  if (results.isLoading) return <ResultSkeleton />;
  if (results.items.length === 0) return <NoResults />;
  const items = preview ? results.items.slice(0, PREVIEW_COUNT) : results.items;

  return (
    <div className="space-y-3">
      {items.map((item) =>
        item.type === "series" ? (
          <SeriesCard
            key={item.id}
            item={item}
            query={query}
            language={language}
          />
        ) : (
          <PlanCard
            key={item.id}
            item={item}
            query={query}
            language={language}
          />
        ),
      )}
      {!preview && results.hasMore && (
        <ShowMore
          onClick={results.loadMore}
          isLoading={results.isLoadingMore}
        />
      )}
    </div>
  );
};

type CardProps<T> = { item: T; query: string; language: string };

const SeriesCard = ({
  item,
  query,
  language,
}: CardProps<Extract<PracticeItem, { type: "series" }>>) => {
  const { t } = useTranslate();
  const title = item.metadata?.title?.trim() || t("plans.untitled", "Untitled");
  const description =
    item.metadata?.description?.trim() || item.metadata?.sub_title?.trim();
  return (
    <PlanCardShell
      to={`/plans?series=${item.id}&lang=${language}`}
      image={resolveImageUrl(item.image)}
      title={title}
      query={query}
      meta={
        item.plans_count
          ? t("home.plans_count", "{count} plans", { count: item.plans_count })
          : null
      }
      description={description}
    />
  );
};

/**
 * A single plan. Search returns it without its series, and the plans page
 * only opens a plan inside one, so its summary is looked up for the link
 * (and, while at it, the plan's length and description).
 */
const PlanCard = ({
  item,
  query,
  language,
}: CardProps<Extract<PracticeItem, { type: "plan" }>>) => {
  const { t } = useTranslate();
  const { data: summary } = useQuery(
    ["plan-summary", item.id, language],
    () => fetchPlanSummary(item.id, language),
    { refetchOnWindowFocus: false, staleTime: 10 * 60_000 },
  );
  const to = summary?.series_id
    ? `/plans?series=${summary.series_id}&plan=${item.id}&lang=${language}`
    : "/plans";
  return (
    <PlanCardShell
      to={to}
      image={resolveImageUrl(item.image)}
      title={item.title?.trim() || t("plans.untitled", "Untitled")}
      query={query}
      meta={
        summary?.total_days
          ? t("home.days_count", "{count} days", { count: summary.total_days })
          : null
      }
      description={summary?.description?.trim()}
    />
  );
};

const PlanCardShell = ({
  to,
  image,
  title,
  query,
  meta,
  description,
}: {
  to: string;
  image: string;
  title: string;
  query: string;
  meta: string | null;
  description?: string | null;
}) => (
  <Link to={to} className={`${RESULT_CARD} flex gap-4`}>
    <Thumb
      src={image}
      className="size-20 sm:h-24 sm:w-32"
      fallback={<IoCalendarClearOutline className="size-6 text-faded-grey" />}
    />
    <div className="min-w-0">
      <p className="font-semibold text-primary group-hover:underline">
        <Highlighted text={title} query={query} />
      </p>
      {meta && <p className="mt-0.5 text-sm text-faded-grey">{meta}</p>}
      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-primary/80">
          {description}
        </p>
      )}
    </div>
  </Link>
);

export default PlanResults;
