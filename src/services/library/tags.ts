import { fetchTags } from "./api.ts";
import { extractTitle } from "./mappers.ts";
import type { TagDTO } from "./types.ts";

/**
 * The application's tags, with each label resolved for one language.
 *
 * A text carries only tag ids (`tag_ids`), so this list is what turns them into
 * something readable. The library already localises the titles, which is why
 * nothing here goes through the app's translation files.
 */
export const getTags = async (language?: string | null): Promise<TagDTO[]> => {
  const tags = await fetchTags();
  return tags.map((tag) => ({
    id: tag.id,
    title: extractTitle(tag.title, language),
    description: extractTitle(tag.description, language) || null,
  }));
};

/** The same list keyed by id, for resolving a text's `tag_ids`. */
export const getTagsById = async (
  language?: string | null,
): Promise<Map<string, TagDTO>> => {
  const tags = await getTags(language);
  return new Map(tags.map((tag) => [tag.id, tag]));
};
