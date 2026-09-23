import { libraryGet, libraryGetOrNull } from "./client.ts";
import type {
  LibraryAlignmentPair,
  LibraryCategory,
  LibraryEdition,
  LibraryPage,
  LibraryRecording,
  LibraryRelatedSegment,
  LibrarySegmentDetail,
  LibrarySegmentSpan,
  LibrarySegmentation,
  LibraryTag,
  LibraryText,
} from "./types.ts";

/** Thin, unopinionated wrappers over the library's /v2 endpoints. */

export const fetchTexts = (params: {
  category_id?: string | null;
  language?: string | null;
  title?: string | null;
  limit: number;
  offset: number;
}) =>
  libraryGet<LibraryPage<LibraryText>>(
    "/v2/texts",
    {
      limit: params.limit,
      offset: params.offset,
      ...(params.category_id ? { category_id: params.category_id } : {}),
      ...(params.language
        ? { language: params.language.trim().toLowerCase() }
        : {}),
      ...(params.title ? { title: params.title } : {}),
    },
    "texts",
  );

/**
 * Text metadata, cached for the session.
 *
 * The same handful of texts is looked up over and over - every related segment
 * has to be classified by the text it belongs to, and the resources panel does
 * that again for every segment the reader selects. The metadata does not change
 * under us, so fetch each one once.
 */
const textCache = new Map<string, Promise<LibraryText | null>>();

export const fetchTextById = (textId: string): Promise<LibraryText | null> => {
  const cached = textCache.get(textId);
  if (cached) return cached;

  const pending = libraryGetOrNull<LibraryText>(
    `/v2/texts/${textId}`,
    undefined,
    "text",
  ).catch((error) => {
    textCache.delete(textId);
    throw error;
  });
  textCache.set(textId, pending);
  return pending;
};

/** Exposed for tests. */
export const clearTextCache = () => textCache.clear();

export const fetchTextEditions = (textId: string, editionType = "critical") =>
  libraryGet<LibraryEdition[]>(
    `/v2/texts/${textId}/editions`,
    { edition_type: editionType },
    "text editions",
  );

export const fetchEdition = (editionId: string) =>
  libraryGetOrNull<LibraryEdition>(
    `/v2/editions/${editionId}`,
    undefined,
    "edition",
  );

export const fetchEditionRecordings = async (
  editionId: string,
): Promise<LibraryRecording[]> => {
  const recordings = await libraryGetOrNull<LibraryRecording[]>(
    `/v2/editions/${editionId}/recordings`,
    undefined,
    "edition recordings",
  );
  return recordings ?? [];
};

/** Same-origin URL the browser can hand straight to an `<audio>` element. */
export const recordingAudioUrl = (recordingId: string) =>
  `/library/v2/recordings/${recordingId}/audio`;

export const fetchEditionSegmentation = (editionId: string) =>
  libraryGetOrNull<LibrarySegmentation>(
    `/v2/editions/${editionId}/segmentation`,
    undefined,
    "segmentation",
  );

export const fetchSegmentationSegments = (
  editionId: string,
  limit: number,
  offset: number,
) =>
  libraryGet<LibraryPage<LibrarySegmentSpan>>(
    `/v2/editions/${editionId}/segmentation/segments`,
    { limit, offset },
    "segmentation segments",
  );

/**
 * Edition content. `spanStart`/`spanEnd` fetch only that slice of the text —
 * without them the whole edition comes down, which for a long text is hundreds
 * of kilobytes to render a single screen.
 */
export const fetchEditionContent = (
  editionId: string,
  spanStart?: number,
  spanEnd?: number,
) =>
  libraryGet<string>(
    `/v2/editions/${editionId}/content`,
    spanStart === undefined || spanEnd === undefined
      ? undefined
      : { span_start: spanStart, span_end: spanEnd },
    "edition content",
  );

export const fetchAlignmentPairs = (
  sourceEditionId: string,
  targetEditionId: string,
  limit: number,
  offset: number,
) =>
  libraryGetOrNull<LibraryPage<LibraryAlignmentPair>>(
    `/v2/editions/${sourceEditionId}/alignments/${targetEditionId}`,
    { limit, offset },
    "edition alignments",
  );

export const fetchSegmentDetail = (segmentId: string) =>
  libraryGetOrNull<LibrarySegmentDetail>(
    `/v2/segments/${segmentId}`,
    undefined,
    "segment",
  );

export const fetchSegmentContent = (segmentId: string) =>
  libraryGetOrNull<string>(
    `/v2/segments/${segmentId}/content`,
    undefined,
    "segment content",
  );

export const fetchRelatedSegments = (
  segmentId: string,
  params: { limit: number; offset: number; text_id?: string | null },
) =>
  libraryGet<LibraryPage<LibraryRelatedSegment>>(
    `/v2/segments/${segmentId}/related`,
    {
      limit: params.limit,
      offset: params.offset,
      ...(params.text_id ? { text_id: params.text_id } : {}),
    },
    "related segments",
  );

export const fetchCategories = (params: {
  parent_id?: string | null;
  language?: string | null;
}) =>
  libraryGet<LibraryCategory[]>(
    "/v2/categories",
    {
      ...(params.parent_id ? { parent_id: params.parent_id } : {}),
      ...(params.language
        ? { language: params.language.trim().toLowerCase() }
        : {}),
    },
    "categories",
  );

/**
 * The application's whole tag list, cached for the session.
 *
 * It is a handful of entries that every text's tag ids point into, and it does
 * not change under us, so fetch it once rather than per listing.
 */
let tagsRequest: Promise<LibraryTag[]> | null = null;

export const fetchTags = (): Promise<LibraryTag[]> => {
  tagsRequest ??= libraryGet<LibraryTag[]>("/v2/tags", undefined, "tags").catch(
    (error) => {
      tagsRequest = null;
      throw error;
    },
  );
  return tagsRequest;
};

/** Exposed for tests. */
export const clearTagsCache = () => {
  tagsRequest = null;
};

export const fetchCategoryById = (categoryId: string, language?: string) =>
  libraryGetOrNull<LibraryCategory>(
    `/v2/categories/${categoryId}`,
    language ? { language: language.trim().toLowerCase() } : undefined,
    "category",
  );

export const fetchContentSearch = (params: {
  query: string;
  search_type?: string | null;
  limit?: number;
  text_id?: string | null;
  edition_id?: string | null;
}) =>
  libraryGet<Record<string, unknown>>(
    "/v2/content-search",
    {
      query: params.query,
      limit: params.limit ?? 10,
      ...(params.search_type ? { search_type: params.search_type } : {}),
      ...(params.text_id ? { text_id: params.text_id } : {}),
      ...(params.edition_id ? { edition_id: params.edition_id } : {}),
    },
    "content search",
  );
