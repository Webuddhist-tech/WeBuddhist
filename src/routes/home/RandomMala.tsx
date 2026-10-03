import { useMemo } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { fetchPresetAccumulators } from "../mantras/api/accumulatorApi.ts";
import {
  getPresetDisplayDescription,
  getPresetDisplayTitle,
} from "../mantras/utils/groupUtils.ts";
import { getLanguageClass } from "../../utils/helperFunctions.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import PanelWord from "./PanelWord.tsx";
import type { PlanLanguageCode } from "../planviewer/utils/seriesUtils.ts";

type RandomMalaProps = {
  apiLanguage: string;
  language: PlanLanguageCode;
  onOpenApp: () => void;
};

/**
 * One mala, chosen at random, shown beside the mala section.
 *
 * The web does not list the malas - counting happens in the app - so this is a
 * single example of what is in there rather than a catalogue. A different one
 * appears each time the page is loaded.
 */
const RandomMala = ({ apiLanguage, language, onOpenApp }: RandomMalaProps) => {
  const { t } = useTranslate();

  const { data, isLoading } = useQuery(
    ["preset-accumulators", apiLanguage],
    () => fetchPresetAccumulators(apiLanguage),
    { refetchOnWindowFocus: false },
  );

  const presets = data?.accumulators ?? [];

  // Picked once per load: re-rolling on every render would change the mala
  // under the reader as the page re-renders around it.
  const preset = useMemo(
    () =>
      presets.length > 0
        ? presets[Math.floor(Math.random() * presets.length)]
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presets.length],
  );

  const contentFontClass = getLanguageClass(
    language === "BO" ? "bo-IN" : language === "ZH" ? "zh-Hans-CN" : "en",
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }

  if (!preset) {
    // Nothing to show - fall back to the section's own word so the panel is
    // never an empty box.
    return <PanelWord>{t("home.mala_title", "Mala")}</PanelWord>;
  }

  const title = getPresetDisplayTitle(preset, language);
  const description = getPresetDisplayDescription(preset, language);
  const mantraText = preset.mantra?.mantra?.trim() ?? "";
  const imageUrl =
    preset.mantra?.mala_image_url?.trim() ||
    preset.mala_image_url?.trim() ||
    "";

  return (
    <button
      type="button"
      onClick={onOpenApp}
      aria-label={t(
        "mantras.open_app_for_mantra",
        "Download the app to practice {title}",
        { title },
      )}
      className="group flex w-full flex-col items-center gap-5 py-4 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/40"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-32 object-contain drop-shadow-sm transition duration-500 group-hover:scale-105 sm:size-40"
        />
      ) : (
        <span
          className={`text-5xl font-medium text-amber-800/70 sm:text-6xl ${contentFontClass}`}
        >
          ཨོཾ
        </span>
      )}

      <div>
        <h3
          className={`text-lg font-semibold leading-snug text-[#102544] ${contentFontClass}`}
        >
          {title}
        </h3>
        {(mantraText || description) && (
          <p
            className={`mt-1.5 line-clamp-2 max-w-xs text-sm leading-relaxed text-slate-600 ${contentFontClass}`}
          >
            {mantraText || description}
          </p>
        )}
      </div>
    </button>
  );
};

export default RandomMala;
