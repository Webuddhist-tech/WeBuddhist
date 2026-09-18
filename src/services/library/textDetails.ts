import { resolveTranslationSegmentIds } from "./alignments.ts";
import {
  fetchEditionContent,
  fetchEditionSegmentation,
  fetchSegmentContent,
  fetchSegmentationSegments,
  fetchTextById,
  fetchTextEditions,
} from "./api.ts";
import { LibraryError } from "./client.ts";
import { mapTextToDTO, sliceByCodePoints } from "./mappers.ts";
import type {
  ContentDTO,
  LibrarySegmentSpan,
  SegmentDTO,
  TextDetailWithContentResponse,
  TextDetailsRequest,
} from "./types.ts";

const SEGMENT_SCAN_PAGE_SIZE = 500;

type EditionContext = {
  editionId: string;
  textId: string;
  segmentationId: string;
};

/**
 * Resolve an edition or text id into the ids needed to read the text.
 *
 * Ask the text endpoint first. Every caller in the app passes a text id - the
 * reader takes one straight off the URL, and the version and panel lists hand
 * out text ids too - and for an edition id it answers 200 with an empty list
 * rather than failing, which is what tells us the caller passed one of those
 * instead. Probing /segmentation first was cheaper for an edition id, but no
 * caller supplies one, so in practice it only bought every chapter load a
 * guaranteed 404 before the real lookups began.
 */
const resolveEditionContext = async (
  textOrEditionId: string,
): Promise<EditionContext> => {
  const editions = await fetchTextEditions(textOrEditionId).catch(() => null);
  // No editions under this id means it was not a text id, so read it as an
  // edition id and let the segmentation lookup be the one that can fail.
  const editionId = editions?.[0]?.id ?? textOrEditionId;

  const segmentation = await fetchEditionSegmentation(editionId);
  if (!segmentation) {
    throw new LibraryError(
      `No segmentation found for '${textOrEditionId}'`,
      404,
    );
  }

  return {
    editionId: segmentation.edition_id || editionId,
    textId: segmentation.text_id || textOrEditionId,
    segmentationId: segmentation.id,
  };
};

/**
 * Every segment span of an edition, in order.
 *
 * Only filled in when something needs the whole list: anchoring on a segment id
 * whose position the caller does not already know (a deep link), or building a
 * table of contents. Ordinary paging carries the position forward and never
 * triggers a scan.
 */
const segmentSpanCache = new Map<string, Promise<LibrarySegmentSpan[]>>();

const scanSegmentSpans = async (
  editionId: string,
): Promise<LibrarySegmentSpan[]> => {
  const spans: LibrarySegmentSpan[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchSegmentationSegments(
      editionId,
      SEGMENT_SCAN_PAGE_SIZE,
      offset,
    );
    const items = page.items ?? [];
    spans.push(...items);
    if (!page.has_more || items.length === 0) return spans;
    offset += items.length;
  }
};

export const getAllSegmentSpans = (
  editionId: string,
): Promise<LibrarySegmentSpan[]> => {
  const cached = segmentSpanCache.get(editionId);
  if (cached) return cached;
  const pending = scanSegmentSpans(editionId).catch((error) => {
    segmentSpanCache.delete(editionId);
    throw error;
  });
  segmentSpanCache.set(editionId, pending);
  return pending;
};

const findSegmentIndex = async (
  editionId: string,
  segmentId: string,
): Promise<number> => {
  const spans = await getAllSegmentSpans(editionId);
  const index = spans.findIndex((span) => span.id === segmentId);
  if (index === -1) {
    throw new LibraryError(`Segment with id '${segmentId}' not found`, 404);
  }
  return index;
};

/**
 * A segment's text, one line per entry in its `lines`.
 *
 * The edition content carries no line breaks of its own - the spans in `lines`
 * are the only record of where they fall, and they run edge to edge with no
 * gaps between them. Joining the slices with "" (as the backend does) collapses
 * a four-line verse into a single run-on line, so join with a newline and let
 * the reader decide how to present it.
 */
const joinSegmentLines = (
  span: LibrarySegmentSpan,
  content: string,
  contentStart: number,
): string =>
  (span.lines ?? [])
    .map((line) =>
      sliceByCodePoints(
        content,
        line.start - contentStart,
        line.end - contentStart,
      ),
    )
    .join("\n");

const spanBounds = (
  spans: LibrarySegmentSpan[],
): { start: number; end: number } | null => {
  const lines = spans.flatMap((span) => span.lines ?? []);
  if (lines.length === 0) return null;
  return {
    start: Math.min(...lines.map((line) => line.start)),
    end: Math.max(...lines.map((line) => line.end)),
  };
};

const buildSegments = (
  spans: LibrarySegmentSpan[],
  windowContent: string,
  spanStart: number,
  startPosition: number,
): SegmentDTO[] =>
  spans.map((span, index) => ({
    segment_id: span.id,
    segment_number: startPosition + index,
    content: joinSegmentLines(span, windowContent, spanStart),
    // The edition's own structural role and citation for this segment. The
    // reference is what a reader would actually cite - "2-57" rather than the
    // segment's position in the file.
    type: span.type ?? null,
    reference: span.reference ?? null,
    translation: null,
  }));

/**
 * Text for a set of segments of one edition, with their line breaks intact.
 *
 * Looks them up in that edition's segmentation - cached, so only the first page
 * of a translation pays for it - and slices them out of a single content request
 * covering the range they span. That is both fewer requests than fetching each
 * segment's content separately and the only way to recover the line breaks,
 * since /segments/{id}/content returns the lines already run together.
 */
const fetchSegmentTexts = async (
  segmentIds: string[],
  editionId: string,
): Promise<Map<string, string>> => {
  const texts = new Map<string, string>();
  if (segmentIds.length === 0) return texts;

  const spans = await getAllSegmentSpans(editionId);
  const spanById = new Map(spans.map((span) => [span.id, span]));
  const known = segmentIds
    .map((id) => spanById.get(id))
    .filter((span): span is LibrarySegmentSpan => span !== undefined);

  const bounds = spanBounds(known);
  if (bounds) {
    const content = await fetchEditionContent(
      editionId,
      bounds.start,
      bounds.end,
    );
    known.forEach((span) => {
      texts.set(span.id, joinSegmentLines(span, content, bounds.start));
    });
  }

  // An alignment can point at a segment from a different segmentation of the
  // edition, which the listing above will not contain; fall back for those.
  const missing = segmentIds.filter((id) => !texts.has(id));
  if (missing.length > 0) {
    const contents = await Promise.all(
      missing.map((id) => fetchSegmentContent(id).catch(() => null)),
    );
    missing.forEach((id, index) => {
      const content = contents[index];
      if (content !== null && content !== undefined) texts.set(id, content);
    });
  }

  return texts;
};

const buildContent = (
  context: EditionContext,
  segments: SegmentDTO[],
): ContentDTO => ({
  id: context.editionId,
  text_id: context.textId,
  sections: [
    {
      id: context.segmentationId,
      title: "1",
      section_number: 1,
      parent_id: null,
      segments,
      sections: [],
      created_date: null,
      updated_date: null,
      published_date: null,
    },
  ],
});

const applyTranslations = async (args: {
  segments: SegmentDTO[];
  editionId: string;
  editionTextId: string;
  versionId: string;
}): Promise<void> => {
  // Callers pick a version from the translation/version listings, which hand out
  // text ids, so accept either an edition id or a text id here.
  const versionContext = await resolveEditionContext(args.versionId);
  const [editionText, versionText] = await Promise.all([
    fetchTextById(args.editionTextId),
    fetchTextById(versionContext.textId),
  ]);
  if (!editionText || !versionText) return;

  const translationIdsBySegment = await resolveTranslationSegmentIds({
    segmentIds: args.segments.map((segment) => segment.segment_id),
    editionId: args.editionId,
    editionTextId: args.editionTextId,
    editionText,
    versionEditionId: versionContext.editionId,
    versionTextId: versionContext.textId,
    versionText,
  });
  if (translationIdsBySegment.size === 0) return;

  const allIds = [
    ...new Set([...translationIdsBySegment.values()].flat()),
  ].sort();
  const contentById = await fetchSegmentTexts(allIds, versionContext.editionId);
  const language = versionText.language ?? "";

  args.segments.forEach((segment) => {
    const ids = translationIdsBySegment.get(segment.segment_id);
    if (!ids) return;
    const parts = ids
      .map((id) => contentById.get(id))
      .filter((part): part is string => Boolean(part));
    if (parts.length === 0) return;
    segment.translation = {
      text_id: versionContext.editionId,
      language,
      // Several aligned segments can render one source segment; keep them on
      // separate lines, the same as the lines within a segment.
      content: parts.join("\n"),
    };
  });
};

/**
 * A window of a text edition's segments, with the text's own metadata.
 *
 * Only the requested window is fetched: the segment spans for the window give
 * the character range it covers, and the content endpoint is asked for just that
 * range. The backend equivalent downloads every segment and the entire edition
 * content on every page.
 */
export const getTextDetails = async (
  textOrEditionId: string,
  request: TextDetailsRequest = {},
): Promise<TextDetailWithContentResponse> => {
  const size = request.size ?? 20;
  const direction = request.direction ?? "next";
  const context = await resolveEditionContext(textOrEditionId);

  let windowStart: number;
  let windowLength: number;
  let currentPosition: number;

  if (request.start != null && request.end != null) {
    windowStart = Math.max(0, request.start - 1);
    windowLength = Math.max(1, request.end - windowStart);
    currentPosition = windowStart + 1;
  } else {
    let anchorIndex = 0;
    if (request.segment_position != null) {
      // The caller paged here and already knows where it is; no lookup needed.
      anchorIndex = Math.max(0, request.segment_position - 1);
    } else if (request.segment_id) {
      anchorIndex = await findSegmentIndex(
        context.editionId,
        request.segment_id,
      );
    }

    if (direction === "next") {
      windowStart = anchorIndex;
      windowLength = size;
    } else {
      windowStart = Math.max(0, anchorIndex - size + 1);
      windowLength = anchorIndex + 1 - windowStart;
    }
    currentPosition = anchorIndex + 1;
  }

  const [textData, page] = await Promise.all([
    fetchTextById(context.textId),
    fetchSegmentationSegments(context.editionId, windowLength, windowStart),
  ]);

  if (!textData) {
    throw new LibraryError(`Text with id '${context.textId}' not found`, 404);
  }

  const textDetail = mapTextToDTO(textData, textData.language);
  const spans = page.items ?? [];

  if (spans.length === 0) {
    return {
      text_detail: textDetail,
      content: buildContent(context, []),
      size,
      pagination_direction: direction,
      current_segment_position: windowStart === 0 ? 0 : currentPosition,
      total_segments: windowStart === 0 ? 0 : null,
      has_more_up: windowStart > 0,
      has_more_down: false,
    };
  }

  const lines = spans.flatMap((span) => span.lines ?? []);
  const spanStart = Math.min(...lines.map((line) => line.start));
  const spanEnd = Math.max(...lines.map((line) => line.end));
  const windowContent = await fetchEditionContent(
    context.editionId,
    spanStart,
    spanEnd,
  );

  const segments = buildSegments(
    spans,
    windowContent,
    spanStart,
    windowStart + 1,
  );

  if (request.version_id) {
    await applyTranslations({
      segments,
      editionId: context.editionId,
      editionTextId: context.textId,
      versionId: request.version_id,
    });
  }

  return {
    text_detail: textDetail,
    content: buildContent(context, segments),
    size,
    pagination_direction: direction,
    current_segment_position: currentPosition,
    // Knowing the exact total costs a full scan of every segment; the window's
    // own has_more answers the only question the reader asks of it.
    total_segments: segmentSpanCache.has(context.editionId)
      ? (await getAllSegmentSpans(context.editionId)).length
      : null,
    has_more_up: windowStart > 0,
    has_more_down: Boolean(page.has_more),
  };
};

/** Exposed for tests. */
export const clearSegmentIndexCache = () => segmentSpanCache.clear();

export { resolveEditionContext };
export type { EditionContext };
