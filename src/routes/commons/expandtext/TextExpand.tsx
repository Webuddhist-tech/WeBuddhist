import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import { getLanguageClass } from "../../../utils/helperFunctions";
import { useTransliteration } from "../../../context/TransliterationContext";
const DEFAULT_MAX_LENGTH = 250;

const transformLineBreaks = (content: string): string => {
  if (!content) return content;
  return content.replace(/⤵/g, "<br>");
};

export default function TextExpand({
  children,
  maxLength,
  language,
  transliterable = true,
}: {
  children: string;
  maxLength: number;
  language: string;
  /**
   * Whether the reader's script choice applies here. Source text follows it;
   * a translation does not, since rendering English in Sinhala letters is
   * noise rather than a reading aid.
   */
  transliterable?: boolean;
}) {
  const { t } = useTranslate();
  const {
    displayContent,
    transliterationBelow,
    contentClass,
    transliterationClass,
  } = useTransliteration();
  const [isExpanded, setIsExpanded] = useState(false);
  if (typeof children !== "string") return null;
  if (children.length === 0) return null;
  // Truncate first, then transliterate: a cut through the middle of a
  // conjunct would otherwise convert to something that is not a word.
  const transformedContent = transformLineBreaks(children);
  const shown = isExpanded
    ? transformedContent
    : transformedContent.substring(0, Number(maxLength) || DEFAULT_MAX_LENGTH);
  const below = transliterable ? transliterationBelow(shown) : "";
  return (
    <>
      <div
        className={`text-base text-gray-500 whitespace-pre-line ${
          transliterable ? contentClass(language) : getLanguageClass(language)
        }`}
        dangerouslySetInnerHTML={{
          __html: transliterable ? displayContent(shown) : shown,
        }}
      />
      {transliterable && below && (
        <div
          className={`whitespace-pre-line text-[0.95em] text-gray-400 ${transliterationClass}`}
          dangerouslySetInnerHTML={{ __html: below }}
        />
      )}
      {children.length > maxLength && (
        <button
          className="text-sm text-faded-grey transition hover:text-red-700 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? t("panel.showless") : t("panel.showmore")}
        </button>
      )}
    </>
  );
}
