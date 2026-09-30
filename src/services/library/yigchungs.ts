import { fetchEditionContent, fetchTextById } from "./api.ts";
import { extractTitle } from "./mappers.ts";
import { sliceByCodePoints } from "./mappers.ts";
import { fetchEditionYigchungMarks } from "./yigchungMarks.ts";
import { getAllSegmentSpans, resolveEditionContext } from "./textDetails.ts";
import type { LibrarySegmentSpan } from "./types.ts";

export type YigchungItem = {
  id: string;
  index: number;
  label: string;
  span: { start: number; end: number };
  content: string;
  anchorSegmentId?: string;
};

export type YigchungsResponse = {
  items: YigchungItem[];
  text_detail: { id: string; language: string; title: string } | null;
};

const segmentContainingPosition = (
  spans: LibrarySegmentSpan[],
  position: number,
): string | undefined => {
  const match = spans.find((candidate) => {
    const line = candidate.lines?.[0];
    if (!line) return false;
    return position >= line.start && position < line.end;
  });
  return match?.id;
};

const sliceMarkContent = (
  windowContent: string,
  windowStart: number,
  span: { start: number; end: number },
): string => {
  const relativeStart = span.start - windowStart;
  const relativeEnd = span.end - windowStart;
  if (relativeStart < 0 || relativeEnd <= relativeStart) return "";
  return sliceByCodePoints(windowContent, relativeStart, relativeEnd);
};

export const getYigchungs = async (
  textOrEditionId: string,
): Promise<YigchungsResponse> => {
  const context = await resolveEditionContext(textOrEditionId);

  const [sorted, text, spans] = await Promise.all([
    fetchEditionYigchungMarks(context.editionId),
    fetchTextById(context.textId),
    getAllSegmentSpans(context.editionId),
  ]);

  const language = text?.language ?? "";

  if (sorted.length === 0) {
    return {
      items: [],
      text_detail: text
        ? {
            id: text.id,
            language,
            title: extractTitle(text.title, language),
          }
        : null,
    };
  }

  const windowStart = Math.min(...sorted.map((mark) => mark.span.start));
  const windowEnd = Math.max(...sorted.map((mark) => mark.span.end));
  let windowContent = "";
  try {
    windowContent = await fetchEditionContent(
      context.editionId,
      windowStart,
      windowEnd,
    );
  } catch {
    windowContent = "";
  }

  const items: YigchungItem[] = sorted.map((mark, index) => {
    const label = mark.metadata?.name?.trim() || String(index + 1);
    return {
      id: mark.id,
      index,
      label,
      span: mark.span,
      content: sliceMarkContent(windowContent, windowStart, mark.span),
      anchorSegmentId: segmentContainingPosition(spans, mark.span.start),
    };
  });

  return {
    items,
    text_detail: text
      ? {
          id: text.id,
          language,
          title: extractTitle(text.title, language),
        }
      : null,
  };
};
