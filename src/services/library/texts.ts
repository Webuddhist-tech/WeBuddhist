import {
  fetchCategoryById,
  fetchEdition,
  fetchTextById,
  fetchTextEditions,
  fetchTexts,
} from "./api.ts";
import { LibraryError } from "./client.ts";
import {
  extractTitle,
  mapTextToDTO,
  mapTextToV2DTO,
  mapTextToVersion,
} from "./mappers.ts";
import type {
  LanguageResponse,
  LibraryText,
  TextDTO,
  TextLanguageVersionsResponse,
  TextVersion,
  TextVersionResponse,
  TitleSearchResult,
  V2TextDTO,
  V2TextsCategoryResponse,
} from "./types.ts";

/** The source link lives on the text's first critical edition, not the text. */
export const fetchTextSourceLink = async (
  textId: string,
): Promise<string | null> => {
  try {
    const editions = await fetchTextEditions(textId);
    return editions?.[0]?.source ?? null;
  } catch {
    return null;
  }
};

export const fetchFirstCriticalEditionId = async (
  textId: string,
): Promise<string | null> => {
  try {
    const editions = await fetchTextEditions(textId);
    return editions?.[0]?.id ?? null;
  } catch {
    return null;
  }
};

const fetchTextWithSource = async (
  textId: string,
): Promise<LibraryText | null> => {
  try {
    const [text, sourceLink] = await Promise.all([
      fetchTextById(textId),
      fetchTextSourceLink(textId),
    ]);
    if (!text) return null;
    return sourceLink ? { ...text, source_link: sourceLink } : text;
  } catch {
    return null;
  }
};

const fetchTextsDetails = async (ids: string[]): Promise<LibraryText[]> => {
  const results = await Promise.all(ids.map((id) => fetchTextWithSource(id)));
  return results.filter((item): item is LibraryText => item !== null);
};

/**
 * Accepts either an edition id or a text id and returns the text id.
 * The library 404s /v2/editions/{id} for a text id, which tells us the caller
 * already gave us one.
 */
export const resolveTextId = async (
  textOrEditionId: string,
): Promise<string> => {
  const edition = await fetchEdition(textOrEditionId);
  return edition?.text_id ?? textOrEditionId;
};

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const getTextsByCollection = async (params: {
  collectionId?: string | null;
  language?: string | null;
  title?: string | null;
  skip?: number;
  limit?: number;
}): Promise<V2TextsCategoryResponse> => {
  const { collectionId = null, language = null, title = null } = params;
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  const [page, category] = await Promise.all([
    fetchTexts({
      category_id: collectionId,
      language,
      title,
      limit,
      offset: skip,
    }),
    collectionId
      ? fetchCategoryById(collectionId, language ?? undefined)
      : Promise.resolve(null),
  ]);

  return {
    collection: collectionId
      ? { id: collectionId, title: extractTitle(category?.title, language) }
      : null,
    texts: (page.items ?? []).map((item) => mapTextToV2DTO(item, language)),
    skip,
    limit,
    has_more: Boolean(page.has_more),
  };
};

export const getTextById = async (textId: string): Promise<V2TextDTO> => {
  const data = await fetchTextById(textId);
  if (!data) throw new LibraryError(`Text with id '${textId}' not found`, 404);
  return mapTextToV2DTO(data, data.language);
};

/**
 * List texts as their first critical edition, optionally filtered by title.
 * An empty title returns an unfiltered listing, so callers can show a starting
 * set before the user has typed anything.
 */
export const searchTitles = async (params: {
  title?: string | null;
  limit?: number;
  offset?: number;
}): Promise<TitleSearchResult[]> => {
  const page = await fetchTexts({
    category_id: null,
    language: null,
    title: params.title || null,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  });

  const texts = page.items ?? [];
  if (texts.length === 0) return [];

  const editionIds = await Promise.all(
    texts.map((text) => fetchFirstCriticalEditionId(text.id)),
  );

  return texts
    .map((text, index) => ({
      id: editionIds[index],
      title: extractTitle(text.title, text.language),
    }))
    .filter((item): item is TitleSearchResult => Boolean(item.id));
};

/**
 * The text that holds a family's relationship lists.
 *
 * A translation or commentary carries only a pointer to what it derives from;
 * its own `translations`/`commentaries` are empty, and everything a reader can
 * reach from it actually hangs off that parent. A text with lists of its own is
 * already the hub, and we never climb past one - otherwise a Tibetan text that
 * is itself a translation of a Sanskrit source would start reporting the
 * Sanskrit text's family in place of its own.
 */
export const resolveRelationHub = async (
  text: LibraryText,
): Promise<LibraryText> => {
  const hasOwnRelations =
    (text.translations ?? []).length > 0 ||
    (text.commentaries ?? []).length > 0;
  if (hasOwnRelations) return text;

  const parentId = text.translation_of ?? text.commentary_of;
  if (!parentId) return text;

  return (await fetchTextById(parentId).catch(() => null)) ?? text;
};

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

const buildVersions = (
  details: LibraryText[],
  excludeId: string,
  language: string | null | undefined,
  skip: number,
  limit: number,
): TextVersion[] => {
  const versions = details
    .filter((item) => item.id !== excludeId)
    .map((item) => mapTextToVersion(item, item.language));
  const filtered = language
    ? versions.filter((version) => version.language === language)
    : versions;
  return filtered.slice(skip, skip + limit);
};

const versionsFromTextIds = async (
  translationIds: string[],
  rootText: TextDTO,
  language: string | null | undefined,
  skip: number,
  limit: number,
): Promise<TextVersionResponse> => {
  if (translationIds.length === 0) return { text: rootText, versions: [] };
  const details = await fetchTextsDetails(translationIds);
  return {
    text: rootText,
    versions: buildVersions(details, rootText.id, language, skip, limit),
  };
};

/** Versions of a parent text (the text this one is a translation_of). */
const versionsFromParent = async (
  parentId: string,
  rootText: TextDTO,
  language: string | null | undefined,
  skip: number,
  limit: number,
): Promise<TextVersionResponse> => {
  const parent = await fetchTextById(parentId).catch(() => null);
  if (!parent) return { text: rootText, versions: [] };
  // The parent is one of the versions too. Reading a translation, the text it
  // translates is the one you are most likely to want to switch to, and leaving
  // it out made the root unreachable from any of its own translations.
  return versionsFromTextIds(
    [parent.id, ...(parent.translations ?? [])],
    rootText,
    language,
    skip,
    limit,
  );
};

const versionsFromRelated = async (
  relatedId: string,
  rootText: TextDTO,
  language: string | null | undefined,
  skip: number,
  limit: number,
): Promise<TextVersionResponse> => {
  const related = await fetchTextById(relatedId).catch(() => null);
  if (!related) return { text: rootText, versions: [] };
  if (related.translation_of) {
    return versionsFromParent(
      related.translation_of,
      rootText,
      language,
      skip,
      limit,
    );
  }
  return versionsFromTextIds(
    related.translations ?? [],
    rootText,
    language,
    skip,
    limit,
  );
};

export const getTextVersions = async (params: {
  textId: string;
  language?: string | null;
  skip?: number;
  limit?: number;
}): Promise<TextVersionResponse> => {
  const { textId, language = null } = params;
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  const textData = await fetchTextById(textId);
  if (!textData) {
    throw new LibraryError(`Text with id '${textId}' not found`, 404);
  }

  const rootText = mapTextToDTO(textData, textData.language);
  const translationIds = textData.translations ?? [];

  // A text's own `translations` list is authoritative for "what translations
  // exist of this text" - prefer it even when the text is itself a translation
  // of something else (translation_of only says what this text is a translation
  // OF; it says nothing about what has been translated FROM it). Only climb to
  // the parent for sibling translations when this text has none of its own.
  if (translationIds.length === 0 && textData.translation_of) {
    return versionsFromParent(
      textData.translation_of,
      rootText,
      language,
      skip,
      limit,
    );
  }

  // A commentary has no versions of its own either. The ones a reader can switch
  // to are the versions of the text it comments on, so climb the same way.
  if (translationIds.length === 0 && textData.commentary_of) {
    return versionsFromParent(
      textData.commentary_of,
      rootText,
      language,
      skip,
      limit,
    );
  }

  // Likewise only borrow versions from a related commentary when this text has
  // no translations of its own, so this and getTextLanguages (which counts the
  // same list) cannot disagree about what a text's versions are.
  if (translationIds.length === 0 && !textData.commentary_of) {
    const commentaryIds = textData.commentaries ?? [];
    if (commentaryIds.length > 0) {
      return versionsFromRelated(
        commentaryIds[0],
        rootText,
        language,
        skip,
        limit,
      );
    }
  }

  return versionsFromTextIds(translationIds, rootText, language, skip, limit);
};

export const getTextVersionsByEdition = async (params: {
  editionId: string;
  skip?: number;
  limit?: number;
}): Promise<TextVersionResponse> => {
  const textId = await resolveTextId(params.editionId);
  return getTextVersions({ textId, skip: params.skip, limit: params.limit });
};

/**
 * The reader loads text details by edition id, so each version's id must be a
 * critical edition id rather than the raw library text id.
 */
const resolveVersionEditionIds = async (
  versions: TextVersion[],
): Promise<TextVersion[]> => {
  const editionIds = await Promise.all(
    versions.map((version) => fetchFirstCriticalEditionId(version.id)),
  );
  return versions.map((version, index) => ({
    ...version,
    id: editionIds[index] ?? version.id,
  }));
};

export const getTextVersionsByLanguage = async (params: {
  editionId: string;
  language: string;
  skip?: number;
  limit?: number;
}): Promise<TextLanguageVersionsResponse> => {
  const textId = await resolveTextId(params.editionId);
  const versionsResponse = await getTextVersions({
    textId,
    language: params.language,
    skip: params.skip,
    limit: params.limit,
  });
  return {
    text_id: params.editionId,
    language: params.language,
    available_versions: await resolveVersionEditionIds(
      versionsResponse.versions ?? [],
    ),
  };
};

export const getTextLanguages = async (
  editionId: string,
): Promise<LanguageResponse> => {
  const textId = await resolveTextId(editionId);
  const versionsResponse = await getTextVersions({
    textId,
    skip: 0,
    limit: 1000,
  });

  const counts = new Map<string, number>();
  versionsResponse.versions.forEach((version) => {
    if (!version.language) return;
    counts.set(version.language, (counts.get(version.language) ?? 0) + 1);
  });

  return {
    text_id: editionId,
    title: versionsResponse.text?.title ?? "",
    available_languages: [...counts.entries()].map(([language, count]) => ({
      language,
      language_code: language,
      version_count: count,
    })),
  };
};

// ---------------------------------------------------------------------------
// Commentaries
// ---------------------------------------------------------------------------

const commentariesFromIds = async (
  commentaryIds: string[],
  skip: number,
  limit: number,
  excludeId: string,
): Promise<TextDTO[]> => {
  // Reading a commentary, its own entry in the family's list is not a
  // commentary *on* it, so leave it out.
  const ids = commentaryIds.filter((id) => id !== excludeId);
  if (ids.length === 0) return [];
  const details = await fetchTextsDetails(ids);
  return details
    .map((item) => mapTextToDTO(item, item.language))
    .slice(skip, skip + limit);
};

const commentariesFromParent = async (
  parentId: string,
  skip: number,
  limit: number,
  excludeId: string,
): Promise<TextDTO[]> => {
  const parent = await fetchTextById(parentId).catch(() => null);
  return parent
    ? commentariesFromIds(parent.commentaries ?? [], skip, limit, excludeId)
    : [];
};

const commentariesFromRelated = async (
  relatedId: string,
  skip: number,
  limit: number,
  excludeId: string,
): Promise<TextDTO[]> => {
  const related = await fetchTextById(relatedId).catch(() => null);
  if (!related) return [];
  if (related.commentary_of) {
    return commentariesFromParent(
      related.commentary_of,
      skip,
      limit,
      excludeId,
    );
  }
  return commentariesFromIds(
    related.commentaries ?? [],
    skip,
    limit,
    excludeId,
  );
};

export const getTextCommentaries = async (params: {
  textId: string;
  skip?: number;
  limit?: number;
}): Promise<TextDTO[]> => {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  const textData = await fetchTextById(params.textId);
  if (!textData) {
    throw new LibraryError(`Text with id '${params.textId}' not found`, 404);
  }

  const ownCommentaryIds = textData.commentaries ?? [];

  if (textData.commentary_of) {
    return commentariesFromParent(
      textData.commentary_of,
      skip,
      limit,
      params.textId,
    );
  }

  // A text that lists commentaries of its own is already the hub of its family,
  // so that list is the answer. Climbing to a relative first threw it away: a
  // root text with both translations and commentaries read through its
  // translation, whose own list is empty, and reported no commentaries at all.
  if (ownCommentaryIds.length > 0) {
    return commentariesFromIds(ownCommentaryIds, skip, limit, params.textId);
  }

  // A translation carries no commentaries of its own - they hang off the text it
  // translates - but a reader looking at the translation still expects to find
  // them.
  if (textData.translation_of) {
    return commentariesFromParent(
      textData.translation_of,
      skip,
      limit,
      params.textId,
    );
  }

  const relatedIds = textData.translations ?? [];
  if (relatedIds.length > 0) {
    return commentariesFromRelated(relatedIds[0], skip, limit, params.textId);
  }

  return [];
};

export const getTextCommentariesByEdition = async (params: {
  editionId: string;
  skip?: number;
  limit?: number;
}): Promise<TextDTO[]> => {
  const textId = await resolveTextId(params.editionId);
  return getTextCommentaries({
    textId,
    skip: params.skip,
    limit: params.limit,
  });
};
