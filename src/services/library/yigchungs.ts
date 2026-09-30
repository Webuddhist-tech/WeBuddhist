import { fetchEditionContent, fetchTextById } from "./api.ts";
import { extractTitle } from "./mappers.ts";
import { sliceByCodePoints } from "./mappers.ts";
import { fetchEditionYigchungMarks } from "./yigchungMarks.ts";
import { getAllSegmentSpans, resolveEditionContext } from "./textDetails.ts";
import type { LibrarySegmentSpan } from "./types.ts";
import type { LibraryYigchungMark } from "./yigchungMarks.ts";

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

export type GetYigchungsOptions = {
  /** When false, returns mark metadata and anchors only (no edition content fetches). */
  includeContent?: boolean;
};

const CONTENT_BATCH_SIZE = 5;

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

const buildItemsWithoutContent = (
  sorted: LibraryYigchungMark[],
  spans: LibrarySegmentSpan[] | null,
): YigchungItem[] =>
  sorted.map((mark, index) => {
    const label = mark.metadata?.name?.trim() || String(index + 1);
    return {
      id: mark.id,
      index,
      label,
      span: mark.span,
      content: "",
      anchorSegmentId: spans
        ? segmentContainingPosition(spans, mark.span.start)
        : undefined,
    };
  });

const fetchMarkContentsBatched = async (
  editionId: string,
  marks: LibraryYigchungMark[],
): Promise<Map<string, string>> => {
  const contentByMarkId = new Map<string, string>();
  for (let i = 0; i < marks.length; i += CONTENT_BATCH_SIZE) {
    const batch = marks.slice(i, i + CONTENT_BATCH_SIZE);
    await Promise.all(
      batch.map(async (mark) => {
        try {
          const slice = await fetchEditionContent(
            editionId,
            mark.span.start,
            mark.span.end,
          );
          contentByMarkId.set(mark.id, slice);
        } catch {
          contentByMarkId.set(mark.id, "");
        }
      }),
    );
  }
  return contentByMarkId;
};

export const getYigchungs = async (
  textOrEditionId: string,
  options: GetYigchungsOptions = {},
): Promise<YigchungsResponse> => {
  const includeContent = options.includeContent ?? false;
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

  if (!includeContent) {
    return {
      items: buildItemsWithoutContent(sorted, null),
      text_detail: textDetail,
    };
  }

  const spans = await getAllSegmentSpans(context.editionId);
  const items = buildItemsWithoutContent(sorted, spans);
  const contentByMarkId = await fetchMarkContentsBatched(
    context.editionId,
    sorted,
  );

  items.forEach((item) => {
    const windowContent = contentByMarkId.get(item.id) ?? "";
    item.content = sliceByCodePoints(
      windowContent,
      0,
      item.span.end - item.span.start,
    );
  });

  return { items, text_detail: textDetail };
};
