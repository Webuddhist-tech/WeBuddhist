import type { AnnotatedLine } from "@/services/library/segmentLines.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import type { RecitationLine } from "../utils/recitationText.ts";

type RecitationVerseProps = {
  line: RecitationLine;
  /** The recited text's language, which sets its script and size. */
  recitedLanguage: string;
  /** The reader's language, which the translation is in. */
  readerLanguage: string;
  isCurrent: boolean;
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
 */
const RecitationVerse = ({
  line,
  recitedLanguage,
  readerLanguage,
  isCurrent,
}: RecitationVerseProps) => {
  const { recited, translation } = line;
  const isTibetan = recitedLanguage === "bo";

  const recitedClass = `${
    isTibetan
      ? "text-[22px] leading-[1.75] sm:text-2xl sm:leading-[1.75]"
      : "text-lg leading-8 sm:text-xl"
  } ${isCurrent ? "text-white" : "text-[#8e8e93]"} ${getLanguageClass(recitedLanguage)}`;

  const translationClass = `text-[15px] leading-6 sm:text-base sm:leading-7 ${
    isCurrent ? "text-[#f2f2f7]/80" : "text-[#6c6c70]"
  } ${getLanguageClass(readerLanguage)}`;

  const interleaved =
    translation !== null && translation.length === recited.length;

  return (
    <div className="text-balance break-words">
      {interleaved ? (
        recited.map((row, index) => (
          <div key={index} className={index > 0 ? "mt-2" : undefined}>
            <p className={recitedClass}>
              <Runs line={row} />
            </p>
            <p className={translationClass}>
              <Runs line={translation[index]} />
            </p>
          </div>
        ))
      ) : (
        <>
          {recited.map((row, index) => (
            <p key={index} className={recitedClass}>
              <Runs line={row} />
            </p>
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
