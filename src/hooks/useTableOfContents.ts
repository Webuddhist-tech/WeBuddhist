import { useQuery, type UseQueryResult } from "react-query";
import {
  getTableOfContents,
  type TableOfContentsResponse,
  type TocSection,
} from "@/services/library";

/**
 * The edition's table-of-contents annotation.
 *
 * Two callers need it: the reader header, which has to know whether there is a
 * TOC at all before it offers the toggle, and the panel that draws it. They
 * share one react-query key, so the annotation - and the segment span scan it
 * is bridged through - is fetched once per text rather than once per caller.
 */
export const tableOfContentsQueryKey = (textId?: string | null) => [
  "toc",
  textId,
];

export const useTableOfContents = (
  textId?: string | null,
): UseQueryResult<TableOfContentsResponse> =>
  useQuery<TableOfContentsResponse>(
    tableOfContentsQueryKey(textId),
    () => getTableOfContents(textId as string),
    {
      enabled: !!textId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 20,
      retry: false,
    },
  );

/**
 * The first segment the reader can jump to for a section.
 *
 * A section is anchored by the character span it covers, and the span is
 * resolved to a segment id when the annotation is mapped. That resolution can
 * come up empty - a heading whose span holds no segment start, for instance -
 * so fall back to the first descendant that did resolve, and leave the entry
 * inert only if nothing under it resolved either.
 */
export const firstSegmentIdInSection = (
  section: TocSection,
): string | undefined =>
  section.segments?.[0]?.segment_id ??
  (section.sections ?? []).reduce<string | undefined>(
    (found, child) => found ?? firstSegmentIdInSection(child),
    undefined,
  );

/**
 * Whether there is a table of contents worth offering for this text.
 *
 * Most editions carry no TOC annotation yet. For those the panel has nothing to
 * draw, so the header hides the toggle rather than opening an empty sidebar.
 */
export const hasTableOfContents = (
  toc: TableOfContentsResponse | undefined,
): boolean =>
  (toc?.contents ?? []).some((content) => (content.sections ?? []).length > 0);

export type TocHeading = { id: string; title: string; depth: number };

/**
 * Where each section title belongs in the running text, keyed by the segment it
 * starts at.
 *
 * Several sections routinely share one anchor - a chapter, its first part and
 * that part's first subsection all begin at the same words - so each entry is
 * the whole stack. Sections are visited outermost first, which is both the
 * order they nest in and the order they should be drawn.
 */
export const tocHeadingsBySegment = (
  toc: TableOfContentsResponse | undefined,
): Map<string, TocHeading[]> => {
  const headings = new Map<string, TocHeading[]>();
  const visit = (sections: TocSection[], depth: number) => {
    sections.forEach((section) => {
      const segmentId = firstSegmentIdInSection(section);
      if (segmentId && section.title) {
        const heading = { id: section.id, title: section.title, depth };
        const existing = headings.get(segmentId);
        if (existing) existing.push(heading);
        else headings.set(segmentId, [heading]);
      }
      visit(section.sections ?? [], depth + 1);
    });
  };
  (toc?.contents ?? []).forEach((content) => visit(content.sections ?? [], 0));
  return headings;
};

export type SegmentGroup<T> = {
  key: string;
  headings: TocHeading[];
  segments: T[];
};

/**
 * Segments split into runs, each run introduced by the section titles that
 * begin at its first segment.
 *
 * Prose sets the segments of a run in one paragraph, so the split has to happen
 * here rather than at render time: a heading cannot be dropped into the middle
 * of a paragraph, and breaking the paragraph where a chapter begins is what
 * reads correctly anyway. With no headings to place - the option is off, or the
 * text has no annotation - this is a single run and the reader draws exactly
 * what it drew before.
 */
export const groupSegmentsByHeading = <T extends { segment_id: string }>(
  segments: T[] | undefined,
  headingsBySegment: Map<string, TocHeading[]>,
): SegmentGroup<T>[] => {
  const groups: SegmentGroup<T>[] = [];
  (segments ?? []).forEach((segment) => {
    const headings = headingsBySegment.get(segment.segment_id) ?? [];
    const current = groups[groups.length - 1];
    if (current && headings.length === 0) {
      current.segments.push(segment);
      return;
    }
    groups.push({ key: segment.segment_id, headings, segments: [segment] });
  });
  return groups;
};

/** A stable empty map, so a reader with the option off keeps one identity. */
export const NO_TOC_HEADINGS: Map<string, TocHeading[]> = new Map();
