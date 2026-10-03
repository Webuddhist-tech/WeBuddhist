import { useSearchParams } from "react-router-dom";
import { useTolgee } from "@tolgee/react";
import { useQueryClient } from "react-query";
import { changeLanguage } from "../NavigationBar.tsx";

export const SITE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "bo-IN", label: "བོད་ཡིག" },
  { code: "zh-Hans-CN", label: "中文" },
];

/**
 * The interface language and how to switch it, for every picker in the
 * sidebar shell (the sidebar's footer and the phone's globe button).
 *
 * Switching also writes `?lang=` so a shared link opens in the same language.
 */
export const useSiteLanguage = () => {
  const tolgee = useTolgee(["language"]);
  const queryClient = useQueryClient();
  const [, setParams] = useSearchParams();

  const current =
    SITE_LANGUAGES.find(({ code }) => code === tolgee.getLanguage()) ??
    SITE_LANGUAGES[0];

  const select = (lng: string) => {
    changeLanguage(lng, queryClient, tolgee);
    setParams((prev) => {
      prev.set("lang", lng);
      return prev;
    });
  };

  return { languages: SITE_LANGUAGES, current, select };
};
