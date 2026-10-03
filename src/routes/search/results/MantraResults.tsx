import { useTranslate } from "@tolgee/react";
import { GiPrayerBeads } from "react-icons/gi";
import type { PublicAccumulatorDTO } from "../../mantras/types.ts";
import { getPresetDisplayTitle } from "../../mantras/utils/groupUtils.ts";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
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

type MantraResultsProps = {
  results: CategoryResults<PublicAccumulatorDTO>;
  query: string;
  planLanguage: PlanLanguageCode;
  /** Mantras are counted in the mobile app; the web points there. */
  onOpenApp: () => void;
  preview?: boolean;
};

/**
 * Preset mantras: the bead, the name, and the mantra itself with its
 * pronunciation. Counting happens in the mobile app - presets have no page
 * on the web - so each one offers the app, as the home page's mala does.
 */
const MantraResults = ({
  results,
  query,
  planLanguage,
  onOpenApp,
  preview,
}: MantraResultsProps) => {
  const { t } = useTranslate();
  if (results.isLoading) return <ResultSkeleton />;
  if (results.items.length === 0) return <NoResults />;
  const items = preview ? results.items.slice(0, PREVIEW_COUNT) : results.items;

  return (
    <div className="space-y-3">
      {items.map((preset) => {
        const title = getPresetDisplayTitle(preset, planLanguage);
        const image =
          preset.mantra?.mala_image_url?.trim() ||
          preset.mala_image_url?.trim();
        return (
          <button
            type="button"
            key={preset.id}
            onClick={onOpenApp}
            className={`${RESULT_CARD} flex w-full gap-4 text-left`}
          >
            <Thumb
              src={image}
              className="size-14 rounded-full bg-transparent"
              fallback={<GiPrayerBeads className="size-6 text-faded-grey" />}
            />
            <div className="min-w-0">
              <p className="font-semibold text-primary group-hover:underline">
                <Highlighted text={title} query={query} />
              </p>
              {preset.mantra?.mantra && (
                <p className="mt-1 text-primary/80">{preset.mantra.mantra}</p>
              )}
              {preset.mantra?.pronunciation && (
                <p className="mt-0.5 text-sm italic text-faded-grey">
                  {preset.mantra.pronunciation}
                </p>
              )}
              <p className="mt-2 text-xs font-semibold text-rose-600">
                {t("search_page.count_in_app", "Count it in the app")}
              </p>
            </div>
          </button>
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

export default MantraResults;
