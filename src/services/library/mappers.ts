import type {
  ContributorDTO,
  LibraryContribution,
  LibraryText,
  LocalizedTitle,
  TextDTO,
  TextVersion,
  V2TextDTO,
} from "./types.ts";

/**
 * Pick a display title from the library's per-language title map, preferring the
 * requested language and otherwise falling back to the first non-empty entry.
 */
export const extractTitle = (
  title: LocalizedTitle | string | null | undefined,
  language?: string | null,
): string => {
  if (typeof title === "string") return title.trim();
  if (!title || typeof title !== "object") return "";
  if (language && title[language]) return title[language];
  for (const value of Object.values(title)) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

/**
 * Credits on a text, with each name resolved for the reader's language.
 *
 * The library keys a person's name by script - often only `bo` or `sa` - so the
 * usual title fallback does the work. A person it cannot name is dropped: the
 * only other thing the payload carries is an internal id, which tells a reader
 * nothing.
 */
export const mapContributors = (
  contributions: LibraryContribution[] | null | undefined,
  language?: string | null,
): ContributorDTO[] =>
  (contributions ?? [])
    .map((contribution) => ({
      type: contribution.type,
      name: extractTitle(contribution.name, language),
      role: contribution.role,
    }))
    .filter((contributor) => contributor.type === "ai" || contributor.name);

export const mapTextToV2DTO = (
  item: LibraryText,
  language?: string | null,
): V2TextDTO => ({
  id: item.id ?? "",
  title: extractTitle(item.title, language),
  language: item.language ?? "",
  license: item.license ?? null,
  tag_ids: item.tag_ids ?? [],
});

export const mapTextToDTO = (
  item: LibraryText,
  language?: string | null,
): TextDTO => {
  const date = item.date ?? "";
  return {
    id: item.id ?? "",
    pecha_text_id: item.bdrc ?? item.id ?? "",
    title: extractTitle(item.title, language),
    language: item.language ?? "",
    group_id: item.category_id ?? "",
    type: "root_text",
    summary: "",
    is_published: true,
    created_date: date,
    updated_date: date,
    published_date: date,
    published_by: "",
    categories: item.category_id ? [item.category_id] : [],
    views: 0,
    likes: [],
    source_link: item.source_link ?? null,
    ranking: null,
    license: item.license ?? null,
    tag_ids: item.tag_ids ?? [],
    contributors: mapContributors(item.contributions, language),
  };
};

export const mapTextToVersion = (
  item: LibraryText,
  language?: string | null,
): TextVersion => {
  const date = item.date ?? "";
  return {
    id: item.id ?? "",
    title: extractTitle(item.title, language),
    parent_id: item.translation_of ?? item.commentary_of ?? null,
    priority: null,
    language: item.language ?? "",
    type: "translation",
    group_id: item.category_id ?? "",
    table_of_contents: [],
    is_published: true,
    created_date: date,
    updated_date: date,
    published_date: date,
    published_by: "",
    source_link: item.source_link ?? null,
    ranking: null,
    license: item.license ?? null,
    is_selected: false,
  };
};

/**
 * Slice by Unicode code point rather than UTF-16 unit.
 *
 * The library computes segment line offsets in Python, where string indices are
 * code points. That matches JS slicing only while the text stays inside the BMP,
 * so do it properly instead of relying on that holding for every text.
 */
export const sliceByCodePoints = (
  value: string,
  start: number,
  end: number,
): string => Array.from(value).slice(start, end).join("");
