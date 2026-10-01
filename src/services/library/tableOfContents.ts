import { libraryGet } from "./client.ts";
import { fetchTextById } from "./api.ts";
import { extractTitle } from "./mappers.ts";
import { getAllSegmentSpans, resolveEditionContext } from "./textDetails.ts";
import type { LibrarySegmentSpan, LocalizedTitle } from "./types.ts";

type LibraryTocSection = {
  id: string;
  title: LocalizedTitle;
  span?: { start: number; end: number } | null;
  subsections?: LibraryTocSection[];
};

type LibraryToc = {
  id: string;
  edition_id: string;
  text_id: string;
  sections: LibraryTocSection[];
};

export type TocSection = {
  id: string;
  title: string;
  sections: TocSection[];
  segments: { segment_id: string }[];
};

export type TableOfContentsResponse = {
  contents: { id: string; sections: TocSection[] }[];
  text_detail: { id: string; language: string; title: string } | null;
};

/**
 * The library describes a table-of-contents section by the character span it
 * covers, while the reader navigates by segment id. Bridge the two by taking
 * the first segment that starts inside the section's span.
 *
 * An empty span is not a defect: the library uses one to mark a position
 * rather than a range, which is how it expresses a heading that has no text of
 * its own - a part title standing above its subsections, say. Nothing starts
 * strictly inside such a span, so anchor it to the first segment at or after
 * the position instead. Without that these headings resolve to nothing, which
 * leaves them inert in the sidebar and unplaceable in the text.
 */
const firstSegmentInSpan = (
  spans: LibrarySegmentSpan[],
  span: { start: number; end: number } | null | undefined,
): { segment_id: string }[] => {
  if (!span) return [];
  const isAnchor = (start: number) =>
    span.start === span.end
      ? start >= span.start
      : start >= span.start && start < span.end;
  const match = spans.find((candidate) => {
    const start = candidate.lines?.[0]?.start;
    return start !== undefined && isAnchor(start);
  });
  return match ? [{ segment_id: match.id }] : [];
};

const mapSection = (
  section: LibraryTocSection,
  spans: LibrarySegmentSpan[],
  language: string,
): TocSection => ({
  id: section.id,
  title: extractTitle(section.title, language),
  segments: firstSegmentInSpan(spans, section.span),
  sections: (section.subsections ?? []).map((subsection) =>
    mapSection(subsection, spans, language),
  ),
});

export const getTableOfContents = async (
  textOrEditionId: string,
): Promise<TableOfContentsResponse> => {
  const context = await resolveEditionContext(textOrEditionId);

  const [tocs, text, spans] = await Promise.all([
    libraryGet<LibraryToc[]>(
      `/v2/editions/${context.editionId}/table-of-contents`,
      undefined,
      "table of contents",
    ).catch(() => [] as LibraryToc[]),
    fetchTextById(context.textId),
    getAllSegmentSpans(context.editionId),
  ]);

  const language = text?.language ?? "";

  return {
    contents: (tocs ?? []).map((toc) => ({
      id: toc.id,
      sections: (toc.sections ?? []).map((section) =>
        mapSection(section, spans, language),
      ),
    })),
    text_detail: text
      ? {
          id: text.id,
          language,
          title: extractTitle(text.title, language),
        }
      : null,
  };
};

/** One heading of an edition's outline, flattened for a list. */
export type OutlineEntry = {
  id: string;
  title: string;
  /** How deep the heading nests: 0 for the outermost. */
  depth: number;
  /** The segment the heading is recited from, when one could be placed. */
  segmentId: string | null;
};

/**
 * The segment a heading is recited from: the one its span begins inside,
 * however early that segment started - a verse whose segment carries the tail
 * of the line above still starts there - or else the first that begins within
 * the span. An empty span marks a position, as the library writes a heading
 * with no text of its own, so it takes the first segment at or after it.
 */
const segmentStartingSpan = (
  spans: LibrarySegmentSpan[],
  span: { start: number; end: number } | null | undefined,
): string | null => {
  if (!span) return null;
  const match = spans.find((candidate) => {
    const lines = candidate.lines ?? [];
    if (lines.length === 0) return false;
    const start = Math.min(...lines.map((line) => line.start));
    const end = Math.max(...lines.map((line) => line.end));
    if (start <= span.start && end > span.start) return true;
    return span.start === span.end
      ? start >= span.start
      : start >= span.start && start < span.end;
  });
  return match?.id ?? null;
};

/** A heading's own segment, or the first any heading under it found. */
const outlineAnchor = (
  section: LibraryTocSection,
  spans: LibrarySegmentSpan[],
): string | null =>
  segmentStartingSpan(spans, section.span) ??
  (section.subsections ?? []).reduce<string | null>(
    (found, subsection) => found ?? outlineAnchor(subsection, spans),
    null,
  );

const flattenOutline = (
  sections: LibraryTocSection[],
  spans: LibrarySegmentSpan[],
  language: string | null | undefined,
  depth: number,
  into: OutlineEntry[],
): OutlineEntry[] => {
  sections.forEach((section) => {
    const title = extractTitle(section.title, language).trim();
    if (title) {
      into.push({
        id: section.id,
        title,
        depth,
        segmentId: outlineAnchor(section, spans),
      });
    }
    flattenOutline(
      section.subsections ?? [],
      spans,
      language,
      title ? depth + 1 : depth,
      into,
    );
  });
  return into;
};

/**
 * An edition's outline as one list, outermost heading first - the order the
 * headings both nest and are recited in - each with the segment it starts at.
 * The live controller's section list, for a page that follows one.
 *
 * Most of the library has no outline yet; such an edition has no entries, and
 * costs no segment scan.
 */
export const getTableOfContentsOutline = async (
  textOrEditionId: string,
  language?: string | null,
): Promise<OutlineEntry[]> => {
  const context = await resolveEditionContext(textOrEditionId);
  const tocs = await libraryGet<LibraryToc[]>(
    `/v2/editions/${context.editionId}/table-of-contents`,
    undefined,
    "table of contents",
  ).catch(() => [] as LibraryToc[]);
  const sections = (tocs ?? []).flatMap((toc) => toc.sections ?? []);
  if (sections.length === 0) return [];

  const spans = await getAllSegmentSpans(context.editionId);
  return flattenOutline(sections, spans, language, 0, []);
};
