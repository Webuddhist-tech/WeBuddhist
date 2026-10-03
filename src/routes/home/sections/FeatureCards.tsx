import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { GiPrayerBeads } from "react-icons/gi";
import { IoSunnyOutline } from "react-icons/io5";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fetchPresetAccumulators } from "../../mantras/api/accumulatorApi.ts";
import { fetchPublicSeries } from "../../planviewer/api/plansApi.ts";
import { getPresetDisplayTitle } from "../../mantras/utils/groupUtils.ts";
import {
  resolveImageUrl,
  type PlanLanguageCode,
} from "../../planviewer/utils/seriesUtils.ts";
import { PANEL_CLASS, PRIMARY_ACTION } from "../components/HomeSection.tsx";
import { pickSeries } from "./PlansSection.tsx";

type FeatureCardsProps = {
  apiLanguage: string;
  planLanguage: PlanLanguageCode;
  onOpenApp: () => void;
};

const MAX_BEADS = 5;

/**
 * Where a bead sits on the string: spread evenly either side of the middle
 * and dropping away towards the ends, so a handful of beads reads as the
 * bottom of a hanging mala.
 */
const beadTransform = (index: number, count: number) => {
  const offset = index - (count - 1) / 2;
  return `translate(${offset * 54}px, ${-offset * offset * 8}px)`;
};

/**
 * Two centred cards pitching the habits behind the site - counting a mala
 * in the app, and following a daily plan - each with real artwork rising
 * from the bottom edge.
 */
const FeatureCards = ({
  apiLanguage,
  planLanguage,
  onOpenApp,
}: FeatureCardsProps) => {
  const { t } = useTranslate();
  const { data: presets } = useQuery(
    ["preset-accumulators", apiLanguage],
    () => fetchPresetAccumulators(apiLanguage),
    { refetchOnWindowFocus: false },
  );
  const { data: seriesData } = useQuery(
    ["public-series", apiLanguage],
    () => fetchPublicSeries(apiLanguage),
    { refetchOnWindowFocus: false },
  );

  // Each preset mantra has its own bead; strung together they make a mala.
  const beads = (presets?.accumulators ?? [])
    .map((preset) => ({
      id: preset.id,
      title: getPresetDisplayTitle(preset, planLanguage),
      image:
        preset.mantra?.mala_image_url?.trim() || preset.mala_image_url?.trim(),
    }))
    .filter((bead) => bead.image)
    .slice(0, MAX_BEADS);
  const planImages = pickSeries(seriesData?.series ?? [], 3).map((series) =>
    resolveImageUrl(series.image),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FeatureCard
        icon={GiPrayerBeads}
        title={t("home.mala_title", "Mala")}
        body={t(
          "home.mala_short",
          "Count your recitations, bead by bead, in the app.",
        )}
        action={
          <button type="button" onClick={onOpenApp} className={PRIMARY_ACTION}>
            {t("home.mala_action", "Get the app")}
          </button>
        }
        className="bg-gradient-to-b from-stone-100 via-stone-100 to-rose-100"
      >
        {beads.length > 0 && (
          <div className="pb-8">
            <div className="relative mx-auto h-32">
              {beads.map((bead, index) => (
                <img
                  key={bead.id}
                  src={bead.image}
                  alt={bead.title}
                  title={bead.title}
                  style={{ transform: beadTransform(index, beads.length) }}
                  className="absolute inset-x-0 bottom-0 mx-auto size-[4.5rem] object-contain drop-shadow-lg"
                />
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-faded-grey">
              {beads.map((bead) => bead.title).join(" · ")}
            </p>
          </div>
        )}
      </FeatureCard>

      <FeatureCard
        icon={IoSunnyOutline}
        title={t("home.habit_title", "Daily practice plans")}
        body={t("home.habit_body", "Build a daily practice habit.")}
        action={
          <Link to="/plans" className={PRIMARY_ACTION}>
            {t("home.explore", "Explore")}
          </Link>
        }
        className="bg-gradient-to-b from-stone-100 via-stone-100 to-rose-100"
      >
        {planImages.length > 0 && (
          // Fanned out like a hand of cards, the newest on top.
          <div className="relative mx-auto h-56 w-72">
            {planImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                style={{
                  transform: fanTransform(index, planImages.length),
                  zIndex: index,
                }}
                className="absolute inset-x-0 bottom-0 mx-auto aspect-[3/4] w-40 rounded-xl object-cover shadow-xl ring-4 ring-white"
              />
            ))}
          </div>
        )}
      </FeatureCard>
    </div>
  );
};

/** A card's place in the fan, centred however many there are. */
const fanTransform = (index: number, count: number) => {
  const offset = index - (count - 1) / 2;
  return `translateX(${offset * 64}px) rotate(${offset * 6}deg)`;
};

const FeatureCard = ({
  icon: Icon,
  title,
  body,
  action,
  className,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action: ReactNode;
  className?: string;
  children?: ReactNode;
}) => (
  <div
    className={cn(
      PANEL_CLASS,
      "flex flex-col items-center overflow-hidden px-8 pt-10 text-center",
      className,
    )}
  >
    <span className="flex size-9 items-center justify-center rounded-full bg-rose-600 text-white">
      <Icon className="size-4" />
    </span>
    <h2 className="mt-5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
      {title}
    </h2>
    <p className="mt-3 text-primary/80">{body}</p>
    <div className="mt-6">{action}</div>
    <div className="mt-8 w-full">{children}</div>
  </div>
);

export default FeatureCards;
