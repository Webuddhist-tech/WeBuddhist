import { useMemo } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { fetchPublicSeries } from "../planviewer/api/plansApi.ts";
import {
  getSeriesTitleForLanguage,
  resolveImageUrl,
  type PlanLanguageCode,
} from "../planviewer/utils/seriesUtils.ts";
import { getLanguageClass } from "../../utils/helperFunctions.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import PanelWord from "./PanelWord.tsx";

type RandomPlanImageProps = {
  apiLanguage: string;
  language: PlanLanguageCode;
};

/**
 * A single plan's artwork, chosen at random, shown beside the plans section.
 *
 * The front page introduces plans rather than listing them, so this is one of
 * them standing for the rest - a different plan each time the page loads.
 */
const RandomPlanImage = ({ apiLanguage, language }: RandomPlanImageProps) => {
  const { t } = useTranslate();

  const { data, isLoading } = useQuery(
    ["public-series", apiLanguage],
    () => fetchPublicSeries(apiLanguage),
    { refetchOnWindowFocus: false },
  );

  // Only plans that actually have artwork can stand in for the section.
  const illustrated = useMemo(
    () =>
      (data?.series ?? []).filter((series) => resolveImageUrl(series.image)),
    [data],
  );

  const series = useMemo(
    () =>
      illustrated.length > 0
        ? illustrated[Math.floor(Math.random() * illustrated.length)]
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [illustrated.length],
  );

  if (isLoading) {
    return <Skeleton className="aspect-[3/2] w-full" />;
  }

  if (!series) {
    return <PanelWord>{t("header.plans", "Plans")}</PanelWord>;
  }

  const title = getSeriesTitleForLanguage(
    series.metadata,
    language,
    t("plans.untitled_series", "Untitled series"),
  );

  return (
    <figure>
      <img
        data-testid="plan-artwork"
        src={resolveImageUrl(series.image)}
        alt=""
        className="aspect-[3/2] w-full object-cover"
      />
      <figcaption
        className={`mt-4 text-sm text-slate-600 ${getLanguageClass(
          language === "BO" ? "bo-IN" : language === "ZH" ? "zh-Hans-CN" : "en",
        )}`}
      >
        {title}
      </figcaption>
    </figure>
  );
};

export default RandomPlanImage;
