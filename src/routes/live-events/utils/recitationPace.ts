import type { AnnotatedLine } from "@/services/library/segmentLines.ts";

/**
 * How fast the room is chanting, learned from how long each line it has
 * finished took, and how the line it is on now is likely to run.
 *
 * Time is measured per character: a line twice as long takes about twice as
 * long to chant. A character here is a written letter with its vowels and
 * subjoined letters - one stack of Tibetan, one letter of English - and
 * punctuation, the tsheg and the spaces are not counted, being unsounded.
 */

/** A sample is a step from one line to the next: within these, it is kept. */
const MIN_STEP_MS = 400;
const MAX_STEP_MS = 120_000;
/** A move over more lines than this is the operator jumping, not chanting. */
const MAX_LINES_PER_STEP = 3;
/** The pace is the median of the latest steps: quick to follow, hard to throw. */
const SAMPLES_KEPT = 10;

const SOUNDED = /[\p{L}\p{N}]/u;

const graphemes = (text: string): string[] => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
};

/** The characters of a stretch of text that are chanted. */
export const chantedLength = (text: string): number =>
  graphemes(text).filter((cluster) => SOUNDED.test(cluster)).length;

/** A line's chanted characters: its yigchung is read silently. */
export const lineChantedLength = (line: AnnotatedLine): number =>
  line.reduce(
    (sum, run) => sum + (run.yigchung ? 0 : chantedLength(run.text)),
    0,
  );

export const verseChantedLength = (lines: AnnotatedLine[]): number =>
  lines.reduce((sum, line) => sum + lineChantedLength(line), 0);

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export type PaceStep = {
  /** How long the room took over the lines it has just left. */
  elapsedMs: number;
  /** The chanted characters of those lines. */
  characters: number;
  /** How many lines the move went forward by. */
  lines: number;
};

/**
 * The samples with one more step taken into account. Steps that are not the
 * room chanting through a line - a jump, a pause for a teaching, a return to
 * an earlier passage, a line with nothing chanted - leave them as they were.
 */
export const addPaceSample = (samples: number[], step: PaceStep): number[] => {
  if (step.lines < 1 || step.lines > MAX_LINES_PER_STEP) return samples;
  if (step.characters < 1) return samples;
  if (step.elapsedMs < MIN_STEP_MS || step.elapsedMs > MAX_STEP_MS)
    return samples;
  return [...samples, step.elapsedMs / step.characters].slice(-SAMPLES_KEPT);
};

/** Milliseconds per chanted character, or null before any step is known. */
export const paceOf = (samples: number[]): number | null =>
  samples.length > 0 ? median(samples) : null;

export type RunTiming = { delayMs: number; durationMs: number };

/**
 * When each chanted run of a verse is reached and how long it takes, at the
 * given pace, in reading order: the underline sweeps each in turn. Yigchung
 * runs, read silently, have no timing and take no time.
 */
export const verseRunTimings = (
  lines: AnnotatedLine[],
  msPerCharacter: number,
): (RunTiming | null)[][] => {
  let reached = 0;
  return lines.map((line) =>
    line.map((run) => {
      if (run.yigchung) return null;
      const characters = chantedLength(run.text);
      if (characters === 0) return null;
      const timing = {
        delayMs: Math.round(reached * msPerCharacter),
        durationMs: Math.round(characters * msPerCharacter),
      };
      reached += characters;
      return timing;
    }),
  );
};
