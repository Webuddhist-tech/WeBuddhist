import { sliceByCodePoints } from "./mappers.ts";
import type { SegmentLine } from "./types.ts";

export type YigchungMarkSpan = {
  span: { start: number; end: number };
  index: number;
};

type EditionPart = {
  start: number;
  end: number;
  yigchungIndex?: number;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Split [rangeStart, rangeEnd) at yigchung mark boundaries (edition code points). */
export const partitionRangeWithYigchung = (
  rangeStart: number,
  rangeEnd: number,
  marks: YigchungMarkSpan[],
): EditionPart[] => {
  if (rangeEnd <= rangeStart) return [];

  const boundaries = new Set<number>([rangeStart, rangeEnd]);
  for (const mark of marks) {
    const { start, end } = mark.span;
    if (end <= rangeStart || start >= rangeEnd) continue;
    boundaries.add(Math.max(rangeStart, start));
    boundaries.add(Math.min(rangeEnd, end));
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const parts: EditionPart[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (end <= start) continue;
    const mid = start + Math.floor((end - start) / 2);
    const covering = marks.find(
      (mark) => mark.span.start <= mid && mark.span.end > mid,
    );
    parts.push({
      start,
      end,
      yigchungIndex: covering?.index,
    });
  }

  return parts;
};

const renderEditionSlice = (
  part: EditionPart,
  windowContent: string,
  windowStart: number,
): string => {
  const text = sliceByCodePoints(
    windowContent,
    part.start - windowStart,
    part.end - windowStart,
  );
  const escaped = escapeHtml(text);
  if (part.yigchungIndex === undefined) return escaped;
  const label = part.yigchungIndex + 1;
  return `<button type="button" class="footnote-marker yigchung-marker" data-yigchung-index="${part.yigchungIndex}" aria-label="Yigchung note ${label}">${label}</button><span class="footnote yigchung-inline">${escaped}</span>`;
};

const buildLineHtml = (
  line: SegmentLine,
  marks: YigchungMarkSpan[],
  windowContent: string,
  windowStart: number,
): string => {
  const parts = partitionRangeWithYigchung(line.start, line.end, marks);
  return parts
    .map((part) => renderEditionSlice(part, windowContent, windowStart))
    .join("");
};

/**
 * Build segment HTML with yigchung spans wrapped for the chapter reader.
 * Skips injection when the segment already carries footnote markup from the library.
 */
export const buildSegmentContentWithYigchung = (
  lines: SegmentLine[] | undefined,
  plainContent: string,
  marks: YigchungMarkSpan[],
  windowContent: string,
  windowStart: number,
): string => {
  if (!lines?.length || marks.length === 0) return plainContent;
  if (/footnote/.test(plainContent)) return plainContent;

  const sortedLines = [...lines].sort((a, b) => a.start - b.start);
  return sortedLines
    .map((line) => buildLineHtml(line, marks, windowContent, windowStart))
    .join("\n");
};
