import { fetchEditionContent, fetchSegmentDetail } from "./api.ts";
import { sliceByCodePoints } from "./mappers.ts";
import { getAllSegmentSpans } from "./textDetails.ts";
import type { SegmentLine } from "./types.ts";
import { partitionRangeWithYigchung } from "./yigchungInline.ts";
import type { YigchungMarkSpan } from "./yigchungInline.ts";
import { getYigchungMarkSpans } from "./yigchungMarks.ts";

/** A stretch of a line; `yigchung` when the edition marks it as small script. */
export type LineRun = { text: string; yigchung: boolean };

/** One line of a segment, where the edition's line annotations break it. */
export type AnnotatedLine = LineRun[];

export type AnnotatedSegment = {
  lines: AnnotatedLine[];
  /** The edition's citation for the segment, e.g. "1-14". */
  reference: string | null;
  /** The edition's structural role: verse, front_matter, … */
  type: string | null;
};

const appendRun = (line: AnnotatedLine, run: LineRun) => {
  if (!run.text) return;
  const last = line[line.length - 1];
  if (last && last.yigchung === run.yigchung) last.text += run.text;
  else line.push({ ...run });
};

/** Lines run edge to edge, so the space between two of them lands on one. */
const trimLine = (line: AnnotatedLine): AnnotatedLine => {
  if (line.length === 0) return line;
  line[0].text = line[0].text.replace(/^\s+/, "");
  const last = line[line.length - 1];
  last.text = last.text.replace(/\s+$/, "");
  return line.filter((run) => run.text);
};

const annotateLine = (
  line: SegmentLine,
  marks: YigchungMarkSpan[],
  content: string,
  contentStart: number,
): AnnotatedLine => {
  const runs: AnnotatedLine = [];
  for (const part of partitionRangeWithYigchung(line.start, line.end, marks)) {
    appendRun(runs, {
      text: sliceByCodePoints(
        content,
        part.start - contentStart,
        part.end - contentStart,
      ),
      yigchung: part.yigchungIndex !== undefined,
    });
  }
  return trimLine(runs);
};

/**
 * Segments of one edition, each broken into the lines the library records for
 * it and split wherever the edition marks yigchung.
 *
 * Text served elsewhere - the recitation endpoint among them - runs a verse's
 * lines together and drops the small script's markings, and the library's
 * annotations are the only record of either. The edition is found from the
 * first id; the segments are then one segmentation scan (cached per edition)
 * and one content request across the range they span.
 *
 * Only what the library can place comes back: an id it does not know, or a
 * first id with no edition behind it, is simply absent, and the caller keeps
 * its own text for that segment. Yigchung is a refinement on top of the lines,
 * so marks that fail to load leave plain lines rather than none.
 */
export const getAnnotatedSegments = async (
  segmentIds: string[],
): Promise<Map<string, AnnotatedSegment>> => {
  const annotated = new Map<string, AnnotatedSegment>();
  const [first] = segmentIds;
  if (!first) return annotated;

  const detail = await fetchSegmentDetail(first);
  const editionId = detail?.edition_id;
  if (!editionId) return annotated;

  const [spans, marks] = await Promise.all([
    getAllSegmentSpans(editionId),
    getYigchungMarkSpans(editionId).catch((): YigchungMarkSpan[] => []),
  ]);

  const wanted = new Set(segmentIds);
  const known = spans.filter(
    (span) => wanted.has(span.id) && (span.lines?.length ?? 0) > 0,
  );
  if (known.length === 0) return annotated;

  const lines = known.flatMap((span) => span.lines);
  const start = Math.min(...lines.map((line) => line.start));
  const end = Math.max(...lines.map((line) => line.end));
  const content = await fetchEditionContent(editionId, start, end);

  for (const span of known) {
    annotated.set(span.id, {
      lines: [...span.lines]
        .sort((a, b) => a.start - b.start)
        .map((line) => annotateLine(line, marks, content, start))
        .filter((line) => line.length > 0),
      reference: span.reference ?? null,
      type: span.type ?? null,
    });
  }
  return annotated;
};
