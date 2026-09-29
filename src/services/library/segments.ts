import {
  fetchRelatedSegments,
  fetchSegmentContent,
  fetchSegmentDetail,
  fetchTextById,
} from "./api.ts";
import { LibraryError } from "./client.ts";
import { extractTitle } from "./mappers.ts";
import { fetchTextSourceLink } from "./texts.ts";
import type {
  LibraryRelatedSegment,
  LibraryText,
  ParentSegment,
  V2SegmentCommentariesResponse,
  V2SegmentInfoResponse,
  V2SegmentResponse,
  V2SegmentRootTextResponse,
  V2SegmentTextGroup,
  V2SegmentTranslationsResponse,
} from "./types.ts";

const TRANSLATION = "translation";
const COMMENTARY = "commentary";
const ROOT_TEXT = "root_text";
const MAX_LIMIT = 100;
/** Enough for 2000 related segments; a stop so a bad `has_more` cannot spin. */
const RELATED_SCAN_MAX_PAGES = 20;
/** A stop for a `translation_of` chain that loops or runs on. */
const MAX_LINEAGE_DEPTH = 10;

const fetchTextSafe = async (
  textId: string | null | undefined,
): Promise<LibraryText | null> => {
  if (!textId) return null;
  try {
    return await fetchTextById(textId);
  } catch {
    return null;
  }
};

/**
 * The work a text is a version of: follow `translation_of` up to the text that
 * is not itself a translation. An English rendering of a commentary belongs to
 * that commentary's work, and only the top of the chain says `commentary_of` -
 * judging a related text by its own pointers alone is what put every
 * translated commentary in the translations list.
 */
const workOf = async (
  textId: string,
): Promise<{ id: string; text: LibraryText | null }> => {
  let id = textId;
  let text = await fetchTextSafe(id);
  const seen = new Set([id]);
  while (
    text?.translation_of &&
    !seen.has(text.translation_of) &&
    seen.size < MAX_LINEAGE_DEPTH
  ) {
    id = text.translation_of;
    seen.add(id);
    text = await fetchTextSafe(id);
  }
  return { id, text };
};

/** Where the text being read sits: its own work, and the work that comments on. */
type Lineage = {
  ownWorkId: string | null;
  rootWorkId: string | null;
};

const lineageOf = async (ownTextId: string | null): Promise<Lineage> => {
  if (!ownTextId) return { ownWorkId: null, rootWorkId: null };
  const ownWork = await workOf(ownTextId);
  const commented = ownWork.text?.commentary_of;
  return {
    ownWorkId: ownWork.id,
    rootWorkId: commented ? (await workOf(commented)).id : null,
  };
};

/**
 * The panel list a related text belongs in, judged against the text being read.
 *
 * - The same work in another language, the original included: a translation.
 * - The work the open text comments on, in any language: the root text.
 * - Any other commentary, or a translation of one: a commentary.
 * - Anything else, metadata missing included: a translation, so nothing aligned
 *   to the segment silently drops out of the panel.
 *
 * Only a commentary (or a translation of one) has a root text: the work it
 * comments on. A plain translation's original is listed under translations.
 * The segment's own type routes nothing - a title or front matter is listed
 * with the verses and labelled with its type.
 */
const relationOf = async (textId: string, lineage: Lineage): Promise<string> => {
  const work = await workOf(textId);
  if (lineage.ownWorkId && work.id === lineage.ownWorkId) return TRANSLATION;
  if (lineage.rootWorkId && work.id === lineage.rootWorkId) return ROOT_TEXT;
  if (work.text?.commentary_of) return COMMENTARY;
  return TRANSLATION;
};

/** Every related text other than the one being read, with its metadata and relation. */
const classifyRelatedTexts = async (
  items: LibraryRelatedSegment[],
  ownTextId: string | null,
): Promise<Map<string, { text: LibraryText | null; relation: string }>> => {
  // The related lookup also returns other segments of the text being read.
  // Listing the open text among its own relations is noise, so drop it.
  const textIds = uniqueTextIds(items).filter((id) => id !== ownTextId);
  const lineage = await lineageOf(ownTextId);
  const entries = await Promise.all(
    textIds.map(async (textId) => {
      const [text, relation] = await Promise.all([
        fetchTextSafe(textId),
        relationOf(textId, lineage),
      ]);
      return [textId, { text, relation }] as const;
    }),
  );
  return new Map(entries);
};

/**
 * A segment's text with its line breaks restored.
 *
 * /segments/{id}/content returns the segment's lines already run together, which
 * turns a four-line verse into one run-on line. The segment's own `lines` spans
 * say where the breaks fall, and the content is exactly those spans
 * concatenated - so their lengths alone are enough to split it back up, with no
 * need to fetch the edition content.
 */
const splitIntoLines = (
  content: string,
  lines: { start: number; end: number }[],
): string => {
  if (lines.length < 2) return content;

  // Code points, not UTF-16 units: the spans are measured the way Python counts.
  const characters = Array.from(content);
  const parts: string[] = [];
  let offset = 0;
  for (const line of lines) {
    const length = line.end - line.start;
    parts.push(characters.slice(offset, offset + length).join(""));
    offset += length;
  }

  // If the spans do not account for exactly the text we were given, the split
  // cannot be trusted - hand back what the API said rather than mangling it.
  return offset === characters.length ? parts.join("\n") : content;
};

const fetchContentSafe = async (segmentId: string): Promise<string | null> => {
  try {
    const [content, detail] = await Promise.all([
      fetchSegmentContent(segmentId),
      fetchSegmentDetail(segmentId).catch(() => null),
    ]);
    if (content === null || content === undefined) return null;
    return splitIntoLines(content, detail?.lines ?? []);
  } catch {
    return null;
  }
};

/** The segment being viewed, plus the id of the text it belongs to. */
const fetchParentSegmentWithText = async (
  segmentId: string,
): Promise<{ parent: ParentSegment; textId: string | null }> => {
  const [content, detail] = await Promise.all([
    fetchSegmentContent(segmentId).catch(() => null),
    fetchSegmentDetail(segmentId).catch(() => null),
  ]);
  if (content === null || content === undefined) {
    throw new LibraryError(`Segment with id '${segmentId}' not found`, 404);
  }
  return {
    parent: {
      segment_id: segmentId,
      content: splitIntoLines(content, detail?.lines ?? []),
    },
    textId: detail?.text_id ?? null,
  };
};

const uniqueTextIds = (items: LibraryRelatedSegment[]): string[] => [
  ...new Set(
    items
      .map((item) => item.text_id)
      .filter((textId): textId is string => Boolean(textId)),
  ),
];

/**
 * Every segment related to this one, not just the first page of them.
 *
 * The panel's lists are this list sliced by type, and its buttons are counts of
 * the same slices, so both have to see all of it. Asking for one page and
 * filtering that page afterwards is what made a button promise seven
 * translations and the list open with two: the page was filled by whatever the
 * API returned first, commentaries and structural segments included.
 */
const fetchAllRelatedSegments = async (
  segmentId: string,
): Promise<LibraryRelatedSegment[]> => {
  const all: LibraryRelatedSegment[] = [];
  for (let page = 0; page < RELATED_SCAN_MAX_PAGES; page += 1) {
    const result = await fetchRelatedSegments(segmentId, {
      limit: MAX_LIMIT,
      offset: all.length,
    });
    const items = result.items ?? [];
    all.push(...items);
    if (!result.has_more || items.length === 0) break;
  }
  return all;
};

/** The related segments of `relatedType`, keyed by the text they belong to. */
const groupRelatedByText = (
  items: LibraryRelatedSegment[],
  classified: Map<string, { relation: string }>,
  relatedType: string,
): Map<string, LibraryRelatedSegment[]> => {
  const byText = new Map<string, LibraryRelatedSegment[]>();
  items.forEach((item) => {
    const textId = item.text_id;
    if (!textId || classified.get(textId)?.relation !== relatedType) return;
    const existing = byText.get(textId);
    if (existing) existing.push(item);
    else byText.set(textId, [item]);
  });
  return byText;
};

const relatedSegmentsGroupedByType = async (args: {
  segmentId: string;
  relatedType: string;
  skip: number;
  limit: number;
}): Promise<{
  parentSegment: ParentSegment;
  groups: V2SegmentTextGroup[];
  hasMore: boolean;
}> => {
  const [{ parent: parentSegment, textId: ownTextId }, items] =
    await Promise.all([
      fetchParentSegmentWithText(args.segmentId),
      fetchAllRelatedSegments(args.segmentId),
    ]);
  if (items.length === 0) {
    return { parentSegment, groups: [], hasMore: false };
  }

  const classified = await classifyRelatedTexts(items, ownTextId);
  const byText = groupRelatedByText(items, classified, args.relatedType);

  // Group first, then page. Each list shows one entry per text and its button
  // counts texts, so the window has to be over texts too - paging over raw
  // related segments let a text fall outside a window it was never counted in.
  const page = [...byText.entries()].slice(args.skip, args.skip + args.limit);
  const hasMore = args.skip + args.limit < byText.size;

  // Content and source links only for the texts actually being returned.
  const groups = await Promise.all(
    page.map(async ([textId, segments]) => {
      const text = classified.get(textId)?.text;
      const [sourceLink, contents] = await Promise.all([
        fetchTextSourceLink(textId),
        Promise.all(segments.map((segment) => fetchContentSafe(segment.id))),
      ]);
      return {
        text_id: textId,
        title: extractTitle(text?.title),
        language: text?.language ?? null,
        source_link: sourceLink,
        license: text?.license ?? null,
        segments: segments.map((segment, index) => ({
          id: segment.id,
          content: contents[index],
          type: segment.type ?? null,
        })),
      };
    }),
  );

  return { parentSegment, groups, hasMore };
};

export const getSegmentTranslations = async (params: {
  segmentId: string;
  skip?: number;
  limit?: number;
}): Promise<V2SegmentTranslationsResponse> => {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;
  const { parentSegment, groups, hasMore } = await relatedSegmentsGroupedByType(
    {
      segmentId: params.segmentId,
      relatedType: TRANSLATION,
      skip,
      limit,
    },
  );
  return {
    parent_segment: parentSegment,
    translations: groups,
    skip,
    limit,
    has_more: hasMore,
  };
};

export const getSegmentCommentaries = async (params: {
  segmentId: string;
  skip?: number;
  limit?: number;
}): Promise<V2SegmentCommentariesResponse> => {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;
  const { parentSegment, groups, hasMore } = await relatedSegmentsGroupedByType(
    {
      segmentId: params.segmentId,
      relatedType: COMMENTARY,
      skip,
      limit,
    },
  );
  return {
    parent_segment: parentSegment,
    commentaries: groups,
    skip,
    limit,
    has_more: hasMore,
  };
};

/**
 * The work the text being read comments on, in every language aligned to this
 * segment. Empty unless the text being read is a commentary.
 */
export const getSegmentRootText = async (params: {
  segmentId: string;
  skip?: number;
  limit?: number;
}): Promise<V2SegmentRootTextResponse> => {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;
  const { parentSegment, groups, hasMore } = await relatedSegmentsGroupedByType(
    {
      segmentId: params.segmentId,
      relatedType: ROOT_TEXT,
      skip,
      limit,
    },
  );
  return {
    parent_segment: parentSegment,
    root_text: groups,
    skip,
    limit,
    has_more: hasMore,
  };
};

export const getSegmentById = async (
  segmentId: string,
): Promise<V2SegmentResponse> => {
  // One lookup for both the text and its line spans, rather than fetching the
  // segment's detail again inside fetchContentSafe.
  const [rawContent, detail] = await Promise.all([
    fetchSegmentContent(segmentId).catch(() => null),
    fetchSegmentDetail(segmentId).catch(() => null),
  ]);
  if (rawContent === null || rawContent === undefined) {
    throw new LibraryError(`Segment with id '${segmentId}' not found`, 404);
  }
  const content = splitIntoLines(rawContent, detail?.lines ?? []);

  const text = await fetchTextSafe(detail?.text_id);

  return {
    segment_id: segmentId,
    content,
    text: text
      ? {
          text_id: detail?.text_id ?? "",
          title: extractTitle(text.title),
          language: text.language ?? null,
        }
      : null,
  };
};

export const getSegmentInfo = async (
  segmentId: string,
): Promise<V2SegmentInfoResponse> => {
  const detail = await fetchSegmentDetail(segmentId);
  if (!detail) {
    throw new LibraryError(`Segment with id '${segmentId}' not found`, 404);
  }

  const textId = detail.text_id;
  if (!textId) {
    throw new LibraryError(`Text ID not found for segment '${segmentId}'`, 404);
  }

  const [text, allRelated] = await Promise.all([
    fetchTextById(textId),
    // Count what the panel's lists will actually contain. These are the numbers
    // on the panel buttons, and they used to come from the text's relationships
    // instead: a commentary's front matter reported "root text (1)" because its
    // *text* comments on a root, then opened empty because that *segment* has
    // nothing aligned to it. Relationships are text-level; the lists are
    // segment-level, and the buttons describe the lists. The lists read the
    // same full scan, so the two cannot disagree about where the list ends.
    fetchAllRelatedSegments(segmentId).catch(() => [] as LibraryRelatedSegment[]),
  ]);
  if (!text) {
    throw new LibraryError(`Text with id '${textId}' not found`, 404);
  }

  const classified = await classifyRelatedTexts(allRelated, textId);

  // Each list renders one group per text, so the button counts texts rather
  // than segments.
  const countOfType = (type: string) =>
    [...classified.values()].filter(({ relation }) => relation === type).length;

  return {
    segment_info: {
      segment_id: segmentId,
      text_id: textId,
      translations: countOfType(TRANSLATION),
      related_text: {
        commentaries: countOfType(COMMENTARY),
        root_text: countOfType(ROOT_TEXT),
      },
      resources: { sheets: 0 },
    },
  };
};
