import type { AnnotatedLine } from "@/services/library/segmentLines.ts";
import type { LiveRecitationText, RecitationSegmentDTO } from "../types.ts";

export type RecitationLine = {
  /** The line as recited, in the text's recitation language, line by line. */
  recited: AnnotatedLine[];
  /** The reader's own translation, when they read another language. */
  translation: AnnotatedLine[] | null;
  /** The edition's citation for the line, e.g. "1-14", where it has one. */
  reference: string | null;
};

export type RecitationLines = {
  lines: RecitationLine[];
  /**
   * Every segment id a line goes by, in any language, to the line's position.
   * The operator may be clicking through any edition, so a line is matched by
   * whichever of its ids arrives - that is what lets a reader of English
   * follow a puja driven from the Tibetan.
   */
  lineBySegmentId: Map<string, number>;
};

/**
 * Segment content is stored as light markup. Here it is shown as text: line
 * breaks are kept, every other tag is dropped, and nothing is ever handed to
 * the DOM as HTML.
 */
export const segmentPlainText = (
  content: string | null | undefined,
): string => {
  if (!content) return "";
  const withBreaks = content.replace(/<br\s*\/?>/gi, "\n");
  const parsed = new DOMParser().parseFromString(withBreaks, "text/html");
  return (parsed.body.textContent ?? "").trim();
};

/** A bucket's segment in the language asked for, or else its first. */
export const pickSegment = (
  bucket: Record<string, RecitationSegmentDTO> | undefined,
  preferred: string,
): RecitationSegmentDTO | undefined =>
  bucket ? (bucket[preferred] ?? Object.values(bucket)[0]) : undefined;

const plainLines = (content: string | null | undefined): AnnotatedLine[] =>
  segmentPlainText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => [{ text, yigchung: false }]);

/**
 * The segment's lines as the library breaks and marks them, or - for a
 * segment the library could not place - its own content, split only where
 * the content itself breaks.
 */
const linesOf = (
  segment: RecitationSegmentDTO | undefined,
  text: LiveRecitationText,
): AnnotatedLine[] => {
  if (!segment) return [];
  const annotated = text.annotations?.get(segment.id)?.lines;
  return annotated?.length ? annotated : plainLines(segment.content);
};

/**
 * The segment ids to ask the library about, one list per edition shown: the
 * recited edition's, then the reader's translation's.
 */
export const annotationSegmentIds = (
  text: Pick<LiveRecitationText, "segments" | "language">,
  readerLanguage: string,
): string[][] => {
  const groups = [
    text.segments.flatMap(
      (row) => pickSegment(row.recitation, text.language)?.id ?? [],
    ),
  ];
  if (readerLanguage !== text.language) {
    groups.push(
      text.segments.flatMap(
        (row) => row.translations?.[readerLanguage]?.id ?? [],
      ),
    );
  }
  return groups.filter((group) => group.length > 0);
};

export const recitationLines = (
  text: LiveRecitationText | null | undefined,
  readerLanguage: string,
): RecitationLines => {
  const lineBySegmentId = new Map<string, number>();
  if (!text) return { lines: [], lineBySegmentId };

  const lines = text.segments.map((row, position) => {
    for (const bucket of [
      row.recitation,
      row.translations,
      row.transliterations,
      row.adaptations,
    ]) {
      for (const segment of Object.values(bucket ?? {})) {
        if (segment?.id && !lineBySegmentId.has(segment.id)) {
          lineBySegmentId.set(segment.id, position);
        }
      }
    }

    const recitedSegment = pickSegment(row.recitation, text.language);
    const translation =
      readerLanguage === text.language
        ? []
        : linesOf(row.translations?.[readerLanguage], text);

    return {
      recited: linesOf(recitedSegment, text),
      translation: translation.length > 0 ? translation : null,
      reference: recitedSegment
        ? (text.annotations?.get(recitedSegment.id)?.reference ?? null)
        : null,
    };
  });

  return { lines, lineBySegmentId };
};
