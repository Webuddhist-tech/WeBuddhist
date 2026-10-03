import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoCalendarClearOutline } from "react-icons/io5";
import { fetchPublicSeries } from "../../planviewer/api/plansApi.ts";
import type { SeriesListItemDTO } from "../../planviewer/types.ts";
import {
  getSeriesTitleForLanguage,
  resolveImageUrl,
  type PlanLanguageCode,
} from "../../planviewer/utils/seriesUtils.ts";
import HomeSection, { CardRowSkeleton } from "../components/HomeSection.tsx";

type PlansSectionProps = {
  apiLanguage: string;
  planLanguage: PlanLanguageCode;
};

/** Featured series first, then the rest - only ones with artwork to show. */
export const pickSeries = (series: SeriesListItemDTO[], count: number) =>
  [...series]
    .filter((item) => resolveImageUrl(item.image))
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    .slice(0, count);

/** Three plan series, each opening on the plans page. */
const PlansSection = ({ apiLanguage, planLanguage }: PlansSectionProps) => {
  const { t } = useTranslate();
  // Same key as the plans page, so the two share a request.
  const { data, isLoading } = useQuery(
    ["public-series", apiLanguage],
    () => fetchPublicSeries(apiLanguage),
    { refetchOnWindowFocus: false },
  );
  const series = pickSeries(data?.series ?? [], 3);

  if (!isLoading && series.length === 0) return null;

  return (
    <HomeSection
      icon={IoCalendarClearOutline}
      label={t("header.plans", "Plans")}
      title={t("home.plans_title", "Give the day a shape")}
      seeAllTo="/plans"
    >
      {isLoading ? (
        <CardRowSkeleton />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((item) => {
            const title = getSeriesTitleForLanguage(
              item.metadata,
              planLanguage,
              t("plans.untitled_series", "Untitled series"),
            );
            return (
              <Link
                key={item.id}
                to={`/plans?series=${item.id}&lang=${apiLanguage}`}
                className="group block min-w-0"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-200">
                  <img
                    src={resolveImageUrl(item.image)}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {item.total_days ? (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                      {t("home.days_count", "{count} days", {
                        count: item.total_days,
                      })}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 line-clamp-2 font-semibold leading-snug text-primary group-hover:underline">
                  {title}
                </p>
                {item.plan_count ? (
                  <p className="mt-1 text-sm text-faded-grey">
                    {t("home.plans_count", "{count} plans", {
                      count: item.plan_count,
                    })}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </HomeSection>
  );
};

export default PlansSection;
