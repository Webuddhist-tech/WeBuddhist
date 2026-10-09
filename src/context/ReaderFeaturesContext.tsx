import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

/**
 * What the reader offers, as the address of an embedded reader can switch off.
 * Every feature is on unless the address hides it, so the reader everywhere
 * else (no provider) is untouched.
 */
export const READER_FEATURE_GROUPS = [
  {
    id: "sidebar",
    label: "Sidebar",
    features: [
      { id: "search", label: "Search in this text" },
      { id: "ai", label: "AI ask" },
      { id: "toc", label: "Table of contents" },
      { id: "yigchung", label: "Yigchung" },
      { id: "translations", label: "Translations" },
      { id: "commentary", label: "Commentary" },
      { id: "root_text", label: "Root text" },
      { id: "compare", label: "Compare text" },
      { id: "share", label: "Share" },
    ],
  },
  {
    id: "menu",
    label: "View menu",
    features: [
      { id: "view_menu", label: "Whole view menu" },
      { id: "view_mode", label: "Source / translation" },
      { id: "layout", label: "Layout" },
      { id: "section_titles", label: "Section titles" },
      { id: "script", label: "Script" },
      { id: "autoscroll", label: "Auto scroll" },
    ],
  },
  {
    id: "header",
    label: "Header",
    features: [
      { id: "audio", label: "Audio" },
      { id: "back", label: "Back button" },
    ],
  },
] as const;

export type ReaderFeature =
  (typeof READER_FEATURE_GROUPS)[number]["features"][number]["id"];

export const SIDEBAR_FEATURES = READER_FEATURE_GROUPS[0].features.map(
  (feature) => feature.id,
) as ReaderFeature[];

const ALL_FEATURES = new Set<string>(
  READER_FEATURE_GROUPS.flatMap((group) =>
    group.features.map((feature) => feature.id),
  ),
);

export const LAYOUT_PARAM_VALUES = ["segmented", "prose"] as const;
export const TITLES_PARAM_VALUES = ["shown", "hidden"] as const;

export type ReaderOptions = {
  /** Features the address turned off. */
  hidden: ReadonlySet<ReaderFeature>;
  /** Layout to open in, replacing the reader's remembered choice. */
  layout?: (typeof LAYOUT_PARAM_VALUES)[number];
  /** Whether section titles open drawn into the text. */
  titles?: (typeof TITLES_PARAM_VALUES)[number];
};

const NO_OPTIONS: ReaderOptions = { hidden: new Set() };

const oneOf = <T extends string>(
  values: readonly T[],
  value: string | null,
): T | undefined => values.find((candidate) => candidate === value);

/**
 * `hide` is a comma separated list of feature ids; `layout` and `titles` pick
 * what the reader opens with. Anything unrecognised is ignored, so a link
 * never breaks when an id is later renamed.
 */
export const parseReaderOptions = (params: URLSearchParams): ReaderOptions => ({
  hidden: new Set(
    (params.get("hide") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id): id is ReaderFeature => ALL_FEATURES.has(id)),
  ),
  layout: oneOf(LAYOUT_PARAM_VALUES, params.get("layout")),
  titles: oneOf(TITLES_PARAM_VALUES, params.get("titles")),
});

/** The query that gives `options`, without the keys left at their default. */
export const readerOptionsQuery = (options: Partial<ReaderOptions>) => {
  const params = new URLSearchParams();
  if (options.hidden?.size) params.set("hide", [...options.hidden].join(","));
  if (options.layout) params.set("layout", options.layout);
  if (options.titles) params.set("titles", options.titles);
  return params;
};

const ReaderFeaturesContext = createContext<ReaderOptions>(NO_OPTIONS);

export const ReaderFeaturesProvider = ({
  options,
  children,
}: {
  options: ReaderOptions;
  children: ReactNode;
}) => {
  const hiddenKey = [...options.hidden].sort().join(",");
  const value = useMemo(
    () => options,
    // The set is rebuilt on every parse; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hiddenKey, options.layout, options.titles],
  );
  return (
    <ReaderFeaturesContext.Provider value={value}>
      {children}
    </ReaderFeaturesContext.Provider>
  );
};

export const useReaderOptions = () => useContext(ReaderFeaturesContext);

/** Whether the reader should offer `feature`. */
export const useReaderFeature = (feature: ReaderFeature) =>
  !useContext(ReaderFeaturesContext).hidden.has(feature);
