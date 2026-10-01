import type { CSSProperties } from "react";
import type { AnnotatedLine } from "@/services/library/segmentLines.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import type { RecitationLine } from "../utils/recitationText.ts";
import type { RunTiming } from "../utils/recitationPace.ts";

type RecitationVerseProps = {
  line: RecitationLine;
  /** The recited text's language, which sets its script and size. */
  recitedLanguage: string;
  /** The reader's language, which the translation is in. */
  readerLanguage: string;
  isCurrent: boolean;
  /**
   * For the live line, once the room's pace is known: when the underline
   * reaches each run of the recited lines, and how long it takes over it.
   */
  paceTimings?: (RunTiming | null)[][] | null;
  /** Changes with every move, so the underline starts over on each. */
  paceKey?: number;
};

/** Colour changes as the live line moves on: slow, so the eye follows. */
const FADE = "transition-colors duration-1000 ease-in-out";

/**
 * The underline drawn under a run as the room chants it: a background the
 * width of the run, grown from nothing at the run's own pace. An inline
 * background is laid out as one strip across the lines it wraps over, so a
 * run that wraps is underlined in reading order, line after line.
 */
const paceStyle = (timing: RunTiming): CSSProperties => ({
  backgroundImage: "linear-gradient(var(--rt-pace), var(--rt-pace))",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 100%",
  backgroundSize: "0% 2px",
  paddingBottom: "0.12em",
  animation: `recitation-pace ${timing.durationMs}ms linear ${timing.delayMs}ms both`,
});

/**
 * Small script - an instruction, a gloss, a repeat count - is printed smaller
 * in a pecha and left unchanted. It keeps that here: smaller, and quieter than
 * the line around it, even on the live line.
 */
const Runs = ({
  line,
  timings,
  paceKey,
}: {
  line: AnnotatedLine;
  timings?: (RunTiming | null)[];
  paceKey?: number;
}) => (
  <>
    {line.map((run, index) => {
      if (run.yigchung) {
        return (
          <span
            // Runs are rebuilt with their line and never reordered.
            key={index}
            className="yigchung text-[0.78em] opacity-60"
          >
            {run.text}
          </span>
        );
      }
      const timing = timings?.[index];
      return timing ? (
        <span
          key={`${paceKey}-${index}`}
          data-pace=""
          style={paceStyle(timing)}
        >
          {run.text}
        </span>
      ) : (
        <span key={index}>{run.text}</span>
      );
    })}
  </>
);

/**
 * One segment of the liturgy - the unit the operator moves the room by - laid
 * out as it is printed: a line per line of the edition, with the reader's
 * translation under each line when the two break the same way, and under the
 * whole verse when they do not.
 */
const RecitationVerse = ({
  line,
  recitedLanguage,
  readerLanguage,
  isCurrent,
  paceTimings,
  paceKey,
}: RecitationVerseProps) => {
  const { recited, translation } = line;
  const isTibetan = recitedLanguage === "bo";
  const timings = isCurrent ? paceTimings : null;

  const recitedClass = `${
    isTibetan
      ? "text-[22px] leading-[1.75] sm:text-2xl sm:leading-[1.75]"
      : "text-lg leading-8 sm:text-xl"
  } ${FADE} ${isCurrent ? "text-[var(--rt-live-ink)]" : "text-[var(--rt-soft)]"} ${getLanguageClass(recitedLanguage)}`;

  const translationClass = `text-[15px] leading-6 sm:text-base sm:leading-7 ${FADE} ${
    isCurrent ? "text-[var(--rt-live-soft)]" : "text-[var(--rt-faint)]"
  } ${getLanguageClass(readerLanguage)}`;

  const interleaved =
    translation !== null && translation.length === recited.length;

  const recitedLine = (row: AnnotatedLine, index: number) => (
    <p className={recitedClass}>
      <Runs line={row} timings={timings?.[index]} paceKey={paceKey} />
    </p>
  );

  return (
    <div className="text-balance break-words">
      {interleaved ? (
        recited.map((row, index) => (
          <div key={index} className={index > 0 ? "mt-2" : undefined}>
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
