import type { QueryClient } from "react-query";
import type { TolgeeInstance } from "@tolgee/react";
import { LANGUAGE } from "../../utils/constants.ts";
import { setFontVariables } from "../../config/commonConfigs.ts";

/** The queries whose results depend on the interface language. */
const LANGUAGE_DEPENDENT_QUERIES = [
  "texts",
  "topics",
  "sheets",
  "sidePanel",
  "works",
  "texts-versions",
  "texts-content",
  "sheets-user-profile",
  "table-of-contents",
  "collections",
  "sub-collections",
  "versions",
];

export const invalidateQueries = async (queryClient: QueryClient) => {
  await Promise.all(
    LANGUAGE_DEPENDENT_QUERIES.map((query) =>
      queryClient.invalidateQueries(query),
    ),
  );
};

/** Switches the interface language and refetches what depends on it. */
export const changeLanguage = async (
  lng: string,
  queryClient: QueryClient,
  tolgee: Pick<TolgeeInstance, "changeLanguage">,
) => {
  await tolgee.changeLanguage(lng);
  sessionStorage.setItem("textLanguage", lng);
  localStorage.setItem(LANGUAGE, lng);
  setFontVariables(lng);
  await invalidateQueries(queryClient);
};
