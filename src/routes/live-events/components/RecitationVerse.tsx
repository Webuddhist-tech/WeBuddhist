import type { CSSProperties } from "react";
import type { AnnotatedLine } from "@/services/library/segmentLines.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import type { RecitationLine } from "../utils/recitationText.ts";
import type { LineTiming } from "../utils/recitationPace.ts";

type RecitationVerseProps = {
  line: RecitationLine;
  /** The recited text's language, which sets its script and size. */
  recitedLanguage: string;
  /** The reader's language, which the translation is in. */
  readerLanguage: string;
  isCurrent: boolean;
  /** Set the line larger and airier, for the live view where it stands alone. */
  spacious?: boolean;
  /** The reader's text size, as a multiple of the usual one. */
  scale?: number;
  /**
   * For the live line, once the room's pace is known: when the glow reaches
   * each of its recited lines, and how long it stays.
   */
  paceTimings?: (LineTiming | null)[] | null;
  /** Changes with every move, so the glow starts over on each. */
  paceKey?: number;
};

/** Colour changes as the live line moves on: slow, so the eye follows. */
const FADE = "transition-colors duration-1000 ease-in-out";

/** How long a line takes to light as the room reaches it, and to dim. */
const GLOW_FADE_MS = 400;

/** The glow on the whole live verse, before the room's pace is known. */
const STEADY_GLOW = "[text-shadow:0_0_0.6em_var(--rt-glow)]";

/** A line of the live verse the room is not on: waiting, or done with. */
const RESTING = "opacity-[0.45]";

/**
 * The glow on a line of the live verse as the room chants it: lit as the room
 * reaches the line, dimmed as it leaves for the next. Both fades are set off
 * by the move, the second listed last so that, once due, it wins. The last
 * line chanted has no second, and holds its glow until the next move rather
 * than leave a room slower than its pace with nothing lit.
 */
const glowStyle = (timing: LineTiming, isLast: boolean): CSSProperties => {
  const lighting = `recitation-glow-in ${GLOW_FADE_MS}ms ease-out ${timing.delayMs}ms both`;
  if (isLast) return { animation: lighting };
  const leaving = timing.delayMs + timing.durationMs;
  return {
    animation: `${lighting}, recitation-glow-out ${GLOW_FADE_MS}ms ease-in ${leaving}ms forwards`,
  };
};

/**
 * Small script - an instruction, a gloss, a repeat count - is printed smaller
 * in a pecha and left unchanted. It keeps that here: smaller, and quieter than
 * the line around it, even on the live line.
 */
const Runs = ({ line }: { line: AnnotatedLine }) => (
  <>
    {line.map((run, index) =>
      run.yigchung ? (
        <span
          // Runs are rebuilt with their line and never reordered.
          key={index}
          className="yigchung text-[0.78em] opacity-60"
        >
          {run.text}
        </span>
      ) : (
        <span key={index}>{run.text}</span>
      ),
    )}
  </>
);

/**
 * One segment of the liturgy - the unit the operator moves the room by - laid
 * out as it is printed: a line per line of the edition, with the reader's
 * translation under each line when the two break the same way, and under the
 * whole verse when they do not.
 *
 * On the live line the recited text glows: all of it until the room's pace is
 * known, and after that the line the room is on, the rest resting dimmer.
 */
const RecitationVerse = ({
  line,
  recitedLanguage,
  readerLanguage,
  isCurrent,
  spacious = false,
  scale = 1,
  paceTimings,
  paceKey,
}: RecitationVerseProps) => {
  const { recited, translation } = line;
  const isTibetan = recitedLanguage === "bo";
  const timings = isCurrent ? paceTimings : null;
  const lastTimed = timings
    ? timings.reduce((last, timing, index) => (timing ? index : last), -1)
    : -1;

  const recitedClass = `${
    isTibetan
      ? spacious
        ? "text-[1.625em] leading-[1.7] sm:text-[2em] sm:leading-[1.7]"
        : "text-[1.375em] leading-[1.75] sm:text-[1.5em] sm:leading-[1.75]"
      : "text-[1.125em] leading-[1.75] sm:text-[1.25em]"
  } ${FADE} ${isCurrent ? "text-[var(--rt-live-ink)]" : "text-[var(--rt-soft)]"} ${getLanguageClass(recitedLanguage)}`;

  const translationClass = `${
    spacious
      ? "mt-1 text-[1em] leading-[1.75] sm:text-[1.125em]"
      : "text-[0.9375em] leading-[1.6] sm:text-[1em] sm:leading-[1.75]"
  } ${FADE} ${
    isCurrent ? "text-[var(--rt-live-soft)]" : "text-[var(--rt-faint)]"
  } ${getLanguageClass(readerLanguage)}`;

  const interleaved =
    translation !== null && translation.length === recited.length;

  const recitedLine = (row: AnnotatedLine, index: number) => {
    if (!isCurrent) {
      return (
        <p className={recitedClass}>
          <Runs line={row} />
        </p>
      );
    }
    if (!timings) {
      return (
        <p className={`${recitedClass} ${STEADY_GLOW}`}>
          <Runs line={row} />
        </p>
      );
    }
    const timing = timings[index];
    return timing ? (
      <p
        key={paceKey}
        data-glow=""
        className={recitedClass}
        style={glowStyle(timing, index === lastTimed)}
      >
        <Runs line={row} />
      </p>
    ) : (
      <p className={`${recitedClass} ${RESTING}`}>
        <Runs line={row} />
      </p>
    );
  };

  return (
    <div
      className="text-balance break-words"
      style={{ fontSize: `${16 * scale}px` }}
    >
      {interleaved ? (
        recited.map((row, index) => (
          <div
            key={index}
            className={index > 0 ? (spacious ? "mt-5" : "mt-2") : undefined}
          >
            {recitedLine(row, index)}
            <p className={translationClass}>
              <Runs line={translation[index]} />
            </p>
          </div>
        ))
      ) : (
        <>
          {recited.map((row, index) => (
            <div key={index}>{recitedLine(row, index)}</div>
          ))}
          {translation && (
            <div className="mt-2">
              {translation.map((row, index) => (
                <p key={index} className={translationClass}>
                  <Runs line={row} />
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecitationVerse;
