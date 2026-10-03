import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { groupAddress } from "../../groups/utils/groupHandle.ts";
import {
  getGroupDescriptionForLanguage,
  getGroupTitleForLanguage,
  getMemberInitials,
} from "../../mantras/utils/groupUtils.ts";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
import type { GroupSearchItem } from "../api/searchApi.ts";
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

const TIBETAN = /[ༀ-࿿]/;

type GroupResultsProps = {
  results: CategoryResults<GroupSearchItem>;
  query: string;
  planLanguage: PlanLanguageCode;
  preview?: boolean;
};

/** Communities and pages, each opening the group's own page. */
const GroupResults = ({
  results,
  query,
  planLanguage,
  preview,
}: GroupResultsProps) => {
  const { t } = useTranslate();
  if (results.isLoading) return <ResultSkeleton />;
  if (results.items.length === 0) return <NoResults />;
  const items = preview ? results.items.slice(0, PREVIEW_COUNT) : results.items;

  return (
    <div className="space-y-3">
      {items.map((group) => {
        const title = getGroupTitleForLanguage(group.metadata, planLanguage);
        const subtitle = getGroupDescriptionForLanguage(
          group.metadata,
          planLanguage,
        );
        return (
          <Link
            key={group.id}
            to={groupAddress(group)}
            className={`${RESULT_CARD} flex items-center gap-4`}
          >
            <Thumb
              src={group.avatar_url}
              className="size-14 rounded-full"
              fallback={
                <span className="text-sm font-semibold text-primary">
                  {getMemberInitials(title)}
                </span>
              }
            />
            <div className="min-w-0">
              <p
                className={`font-semibold text-primary group-hover:underline ${TIBETAN.test(title) ? "bo-text" : ""}`}
              >
                <Highlighted text={title} query={query} />
              </p>
              <p className="mt-0.5 truncate text-sm text-faded-grey">
                {[
                  `@${group.slug}`,
                  group.joiner_count
                    ? t("group_page.members_count", {
                        count: group.joiner_count.toLocaleString(),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {subtitle && (
                <p className="mt-1 line-clamp-1 text-sm text-primary/80">
                  {subtitle}
                </p>
              )}
            </div>
          </Link>
        );
      })}
      {!preview && results.hasMore && (
        <ShowMore
          onClick={results.loadMore}
          isLoading={results.isLoadingMore}
        />
      )}
    </div>
  );
};

export default GroupResults;
