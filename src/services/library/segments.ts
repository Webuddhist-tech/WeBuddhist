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
const MAX_SKIP = 10000;
const MAX_LIMIT = 100;
/** Enough for 2000 related segments; a stop so a bad `has_more` cannot spin. */
const RELATED_SCAN_MAX_PAGES = 20;

/**
 * A related text is a commentary when it says so, and a translation otherwise.
 *
 * Only `commentary_of` earns a list of its own. Everything else lands in the
 * translations list: a text carrying `translation_of`, the root text those
 * point back at, a text carrying neither pointer, and one whose metadata could
 * not be fetched. The segment's own type does not route it anywhere - a title
 * or front matter sits in the list alongside the verses, labelled with its type
 * so the reader can tell them apart. Matching on both pointers used to leave a
 * related segment in no list at all, dropping it from the panel silently.
 */
const classifyText = (text: LibraryText | null | undefined): string =>
  text?.commentary_of ? COMMENTARY : TRANSLATION;

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

const fetchParentSegment = async (
  segmentId: string,
): Promise<ParentSegment> => {
  const content = await fetchContentSafe(segmentId);
  if (content === null) {
    throw new LibraryError(`Segment with id '${segmentId}' not found`, 404);
  }
  return { segment_id: segmentId, content };
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
  ownTextId: string | null,
  textById: Map<string, LibraryText | null>,
  relatedType: string,
): Map<string, LibraryRelatedSegment[]> => {
  const byText = new Map<string, LibraryRelatedSegment[]>();
  items.forEach((item) => {
    const textId = item.text_id;
    // The related lookup also returns other segments of the text being read.
    // Listing the open text as its own translation or commentary is noise, so
    // drop it - a commentary was otherwise shown as a commentary on itself.
    if (!textId || textId === ownTextId) return;
    if (classifyText(textById.get(textId)) !== relatedType) return;
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

  const textIds = uniqueTextIds(items);
  const texts = await Promise.all(
    textIds.map((textId) => fetchTextSafe(textId)),
  );
  const textById = new Map(textIds.map((textId, i) => [textId, texts[i]]));

  const byText = groupRelatedByText(
    items,
    ownTextId,
    textById,
    args.relatedType,
  );

  // Group first, then page. Each list shows one entry per text and its button
  // counts texts, so the window has to be over texts too - paging over raw
  // related segments let a text fall outside a window it was never counted in.
  const page = [...byText.entries()].slice(args.skip, args.skip + args.limit);
  const hasMore = args.skip + args.limit < byText.size;

  // Content and source links only for the texts actually being returned.
  const groups = await Promise.all(
    page.map(async ([textId, segments]) => {
      const text = textById.get(textId);
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
 * Callers do not know a segment's root text ahead of time, so resolve it from
 * the segment's own text's translation_of/commentary_of pointer - the inverse of
 * the direction classifyText uses.
 */
const resolveRootTextId = async (segmentId: string): Promise<string | null> => {
  const detail = await fetchSegmentDetail(segmentId);
  if (!detail) return null;
  const text = await fetchTextById(detail.text_id);
  if (!text) return null;
  return text.translation_of ?? text.commentary_of ?? null;
};

export const getSegmentRootText = async (params: {
  segmentId: string;
  textId?: string | null;
  skip?: number;
  limit?: number;
}): Promise<V2SegmentRootTextResponse> => {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;

  const textId = params.textId ?? (await resolveRootTextId(params.segmentId));

  if (!textId) {
    return {
      parent_segment: await fetchParentSegment(params.segmentId),
      root_text: [],
      skip,
      limit,
      has_more: false,
    };
  }

  const [parentSegment, relatedPage] = await Promise.all([
    fetchParentSegment(params.segmentId),
    fetchRelatedSegments(params.segmentId, {
      limit: Math.max(1, Math.min(limit, MAX_LIMIT)),
      offset: Math.max(0, Math.min(skip, MAX_SKIP)),
      text_id: textId,
    }),
  ]);

  const items = relatedPage.items ?? [];
  const hasMore = Boolean(relatedPage.has_more);
  if (items.length === 0) {
    return {
      parent_segment: parentSegment,
      root_text: [],
      skip,
      limit,
      has_more: hasMore,
    };
  }

  const [text, contents] = await Promise.all([
    fetchTextSafe(textId),
    Promise.all(items.map((item) => fetchContentSafe(item.id))),
  ]);

  return {
    parent_segment: parentSegment,
    root_text: [
      {
        text_id: textId,
        title: extractTitle(text?.title),
        language: text?.language ?? null,
        segments: items.map((item, index) => ({
          id: item.id,
          content: contents[index],
          type: item.type ?? null,
        })),
      },
    ],
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

  const rootTextId = text.translation_of ?? text.commentary_of ?? null;
  const items = allRelated.filter(
    (item) => item.text_id && item.text_id !== textId,
  );
  const relatedTextIds = [...new Set(items.map((item) => item.text_id!))];
  const relatedTexts = await Promise.all(
    relatedTextIds.map((id) => fetchTextSafe(id)),
  );
  const textById = new Map(
    relatedTextIds.map((id, index) => [id, relatedTexts[index]]),
  );

  // Each list renders one group per text, so the button counts texts rather
  // than segments.
  const countOfType = (type: string) =>
    new Set(
      items
        .filter((item) => classifyText(textById.get(item.text_id!)) === type)
        .map((item) => item.text_id!),
    ).size;

  return {
    segment_info: {
      segment_id: segmentId,
      text_id: textId,
      translations: countOfType(TRANSLATION),
      related_text: {
        commentaries: countOfType(COMMENTARY),
        root_text: rootTextId && relatedTextIds.includes(rootTextId) ? 1 : 0,
      },
      resources: { sheets: 0 },
    },
  };
};
