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
  const match = spans.find((candidate) =>
    (candidate.lines ?? []).some(
      (line) => position >= line.start && position < line.end,
    ),
  );
  return match?.id;
};

export const getYigchungs = async (
  textOrEditionId: string,
): Promise<YigchungsResponse> => {
  const context = await resolveEditionContext(textOrEditionId);

  const [sorted, text] = await Promise.all([
    fetchEditionYigchungMarks(context.editionId),
    fetchTextById(context.textId),
  ]);

  const language = text?.language ?? "";
  const textDetail = text
    ? {
        id: text.id,
        language,
        title: extractTitle(text.title, language),
      }
    : null;

  if (sorted.length === 0) {
    return { items: [], text_detail: textDetail };
  }

  const spans = await getAllSegmentSpans(context.editionId);

  const contentByMarkId = new Map<string, string>();
  await Promise.all(
    sorted.map(async (mark) => {
      try {
        const slice = await fetchEditionContent(
          context.editionId,
          mark.span.start,
          mark.span.end,
        );
        contentByMarkId.set(mark.id, slice);
      } catch {
        contentByMarkId.set(mark.id, "");
      }
    }),
  );

  const items: YigchungItem[] = sorted.map((mark, index) => {
    const label = mark.metadata?.name?.trim() || String(index + 1);
    const windowContent = contentByMarkId.get(mark.id) ?? "";
    return {
      id: mark.id,
      index,
      label,
      span: mark.span,
      content: sliceByCodePoints(
        windowContent,
        0,
        mark.span.end - mark.span.start,
      ),
      anchorSegmentId: segmentContainingPosition(spans, mark.span.start),
    };
  });

  return { items, text_detail: textDetail };
};
