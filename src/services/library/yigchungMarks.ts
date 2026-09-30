import { libraryGet } from "./client.ts";
import type { YigchungMarkSpan } from "./yigchungInline.ts";

export type LibraryYigchungMark = {
  id: string;
  edition_id: string;
  text_id: string;
  span: { start: number; end: number };
  metadata?: { name?: string | null } | null;
};

const marksByEdition = new Map<string, Promise<LibraryYigchungMark[]>>();

export const clearYigchungMarksCache = (): void => {
  marksByEdition.clear();
};

/** Sorted raw marks for an edition; one network request per edition per session. */
export const fetchEditionYigchungMarks = (
  editionId: string,
): Promise<LibraryYigchungMark[]> => {
  const cached = marksByEdition.get(editionId);
  if (cached) return cached;

  const pending = libraryGet<LibraryYigchungMark[]>(
    `/v2/editions/${editionId}/yigchungs`,
    undefined,
    "yigchungs",
  )
    .then((marks) =>
      [...(marks ?? [])].sort((a, b) => a.span.start - b.span.start),
    )
    .catch((error) => {
      marksByEdition.delete(editionId);
      throw error;
    });

  marksByEdition.set(editionId, pending);
  return pending;
};

/** Sorted yigchung spans for inline segment HTML. */
export const getYigchungMarkSpans = async (
  editionId: string,
): Promise<YigchungMarkSpan[]> => {
  const marks = await fetchEditionYigchungMarks(editionId);
  return marks.map((mark, index) => ({ span: mark.span, index }));
};
