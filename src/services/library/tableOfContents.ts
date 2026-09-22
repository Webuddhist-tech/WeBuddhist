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
