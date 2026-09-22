import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  TRANSLITERATION_MODE,
  TRANSLITERATION_SCRIPT,
} from "../utils/constants.ts";
import {
  ORIGINAL_SCRIPT,
  TRANSLITERATION_MODES,
  getScriptClass,
  isScriptCode,
  isSelectableScript,
  isTransliterationMode,
  transliterateHtml,
} from "../utils/transliteration.ts";
import { getLanguageClass } from "../utils/helperFunctions.tsx";

export type TransliterationContextValue = {
  /** The script the text is transliterated into, or {@link ORIGINAL_SCRIPT}. */
  script: string;
  setScript: (script: string) => void;
  /** Whether the transliteration sits below the text or replaces it. */
  mode: string;
  setMode: (mode: string) => void;
  /** True while a script is chosen, whichever way it is shown. */
  isTransliterating: boolean;
  /** True while the transliteration is shown as a second line. */
  showsBelow: boolean;
  /**
   * What belongs in the text's own slot: the edition's own content while the
   * transliteration sits below it, the converted content while it replaces it.
   */
  displayContent: (content?: string | null) => string;
  /**
   * The transliteration to render beneath the text, or "" when nothing should
   * be added — so a caller can render it unconditionally.
   */
  transliterationBelow: (content?: string | null) => string;
  /** The font class for the text's own slot. */
  contentClass: (language?: string | null) => string;
  /** The font class for the transliteration slot. */
  transliterationClass: string;
};

const read = (
  key: string,
  isValid: (value: string | null) => boolean,
  fallback: string,
): string => {
  try {
    const stored = localStorage.getItem(key);
    return isValid(stored) ? (stored as string) : fallback;
  } catch {
    // Private-mode browsers can throw on access; the default is fine.
    return fallback;
  }
};

const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The choice still applies to this session even if it cannot be stored.
  }
};

/**
 * The default leaves every text in its own script, so a component rendered
 * outside a provider — a panel under test, say — behaves as it did before.
 */
const TransliterationContext = createContext<TransliterationContextValue>({
  script: ORIGINAL_SCRIPT,
  setScript: () => {},
  mode: TRANSLITERATION_MODES.BELOW,
  setMode: () => {},
  isTransliterating: false,
  showsBelow: false,
  displayContent: (content) => content ?? "",
  transliterationBelow: () => "",
  contentClass: (language) => getLanguageClass(language),
  transliterationClass: "",
});

export const TransliterationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Original by default: a reader who has chosen nothing sees the edition
  // exactly as it is stored.
  const [script, setScript] = useState(() =>
    read(TRANSLITERATION_SCRIPT, isSelectableScript, ORIGINAL_SCRIPT),
  );
  const [mode, setMode] = useState(() =>
    read(
      TRANSLITERATION_MODE,
      isTransliterationMode,
      TRANSLITERATION_MODES.BELOW,
    ),
  );

  useEffect(() => {
    store(TRANSLITERATION_SCRIPT, script);
  }, [script]);

  useEffect(() => {
    store(TRANSLITERATION_MODE, mode);
  }, [mode]);

  const isTransliterating = isScriptCode(script);
  const showsBelow = isTransliterating && mode === TRANSLITERATION_MODES.BELOW;

  // The source script is always detected from the text, per character, so an
  // edition that mixes scripts still converts.
  const convert = useCallback(
    (content?: string | null): string =>
      content ? transliterateHtml(content, script) : "",
    [script],
  );

  const displayContent = useCallback(
    (content?: string | null): string => {
      if (!content) return content ?? "";
      return showsBelow ? content : convert(content);
    },
    [convert, showsBelow],
  );

  const transliterationBelow = useCallback(
    (content?: string | null): string => {
      if (!showsBelow || !content) return "";
      const converted = convert(content);
      // Nothing was converted — a second line identical to the first is noise.
      return converted === content ? "" : converted;
    },
    [convert, showsBelow],
  );

  const contentClass = useCallback(
    (language?: string | null) =>
      showsBelow
        ? getLanguageClass(language)
        : getScriptClass(language, script),
    [script, showsBelow],
  );

  const transliterationClass = useMemo(
    () => getScriptClass(null, script),
    [script],
  );

  const value = useMemo(
    () => ({
      script,
      setScript,
      mode,
      setMode,
      isTransliterating,
      showsBelow,
      displayContent,
      transliterationBelow,
      contentClass,
      transliterationClass,
    }),
    [
      script,
      mode,
      isTransliterating,
      showsBelow,
      displayContent,
      transliterationBelow,
      contentClass,
      transliterationClass,
    ],
  );

  return (
    <TransliterationContext.Provider value={value}>
      {children}
    </TransliterationContext.Provider>
  );
};

export const useTransliteration = (): TransliterationContextValue =>
  useContext(TransliterationContext);
