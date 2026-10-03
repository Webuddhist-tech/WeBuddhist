import { useCallback } from "react";
import { useTolgee, useTranslate } from "@tolgee/react";
import localeEn from "@/i18n/en.json";
import localeBoIn from "@/i18n/bo-IN.json";

type Params = Record<string, string | number>;

const LOCAL_STRINGS: Record<string, Record<string, string>> = {
  en: localeEn,
  "bo-IN": localeBoIn,
};

/**
 * `t` for the segment chat. Translations are served from the Tolgee CDN; until
 * the `segment_chat.*` keys are uploaded there, the string for the current
 * language falls back to the repo's i18n files (then to English).
 */
export const useChatTranslate = () => {
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const language = tolgee.getLanguage() ?? "en";

  return useCallback(
    (key: string, params?: Params): string => {
      const local =
        LOCAL_STRINGS[language]?.[key] ??
        (localeEn as Record<string, string>)[key] ??
        key;
      return params ? t(key, local, params) : t(key, local);
    },
    [t, language],
  );
};
