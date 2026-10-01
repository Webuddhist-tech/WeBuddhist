import type { LiveRecitationText, RecitationSegmentDTO } from "../types.ts";

export type RecitationLine = {
  /** The line as recited, in the text's recitation language. */
  recited: string;
  /** The reader's own translation, when they read another language. */
  translation: string | null;
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

const firstContent = (
  bucket: Record<string, RecitationSegmentDTO> | undefined,
  preferred: string,
): string => {
  if (!bucket) return "";
  const segment = bucket[preferred] ?? Object.values(bucket)[0];
  return segmentPlainText(segment?.content);
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

    const translation =
      readerLanguage === text.language
        ? null
        : segmentPlainText(row.translations?.[readerLanguage]?.content) || null;

    return {
      recited: firstContent(row.recitation, text.language),
      translation,
    };
  });

  return { lines, lineBySegmentId };
};
