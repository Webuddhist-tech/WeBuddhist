import { useTranslate } from "@tolgee/react";
import {
  LAYOUT_PARAM_VALUES,
  READER_FEATURE_GROUPS,
  TITLES_PARAM_VALUES,
} from "@/context/ReaderFeaturesContext.tsx";
import type {
  ReaderFeature,
  ReaderOptions,
} from "@/context/ReaderFeaturesContext.tsx";

type EmbedCustomizerProps = {
  options: ReaderOptions;
  onChange: (options: ReaderOptions) => void;
};

const SELECT_CLASS =
  "rounded border border-gray-200 bg-white px-2 py-1 text-sm";

const EmbedCustomizer = ({ options, onChange }: EmbedCustomizerProps) => {
  const { t } = useTranslate();

  const toggleFeature = (feature: ReaderFeature, shown: boolean) => {
    const hidden = new Set(options.hidden);
    if (shown) hidden.delete(feature);
    else hidden.add(feature);
    onChange({ ...options, hidden });
  };

  // An empty value is "leave it to the reader", which keeps the link short.
  const pick =
    <K extends "layout" | "titles">(key: K) =>
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onChange({
        ...options,
        [key]: event.target.value || undefined,
      });

  return (
    <details className="mb-3 rounded border border-gray-200 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium text-gray-600">
        {t("text.embed_customize", "Customize")}
      </summary>
      <div className="space-y-4 pt-3">
        {READER_FEATURE_GROUPS.map((group) => (
          <fieldset key={group.id}>
            <legend className="mb-1 text-xs font-medium uppercase text-gray-500">
              {t(`text.embed_group.${group.id}`, group.label)}
            </legend>
            <div className="grid grid-cols-1 gap-1">
              {group.features.map((feature) => (
                <label
                  key={feature.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={!options.hidden.has(feature.id)}
                    onChange={(event) =>
                      toggleFeature(feature.id, event.target.checked)
                    }
                  />
                  {t(`text.embed_feature.${feature.id}`, feature.label)}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="grid grid-cols-2 items-center gap-2 text-sm text-gray-700">
          <label htmlFor="embed-layout">
            {t("text.embed_default_layout", "Default layout")}
          </label>
          <select
            id="embed-layout"
            className={SELECT_CLASS}
            value={options.layout ?? ""}
            onChange={pick("layout")}
          >
            <option value="">{t("text.embed_default", "Default")}</option>
            {LAYOUT_PARAM_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === "prose" ? "Prose" : "Segmented"}
              </option>
            ))}
          </select>
          <label htmlFor="embed-titles">
            {t("text.embed_default_titles", "Default section titles")}
          </label>
          <select
            id="embed-titles"
            className={SELECT_CLASS}
            value={options.titles ?? ""}
            onChange={pick("titles")}
          >
            <option value="">{t("text.embed_default", "Default")}</option>
            {TITLES_PARAM_VALUES.map((value) => (
              <option key={value} value={value}>
                {value === "shown" ? "Show" : "Hide"}
              </option>
            ))}
          </select>
        </div>
      </div>
    </details>
  );
};

export default EmbedCustomizer;
