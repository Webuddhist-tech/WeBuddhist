import { convertPali, SCRIPTS } from "pali_script_convertor";
import { getLanguageClass } from "./helperFunctions.tsx";

/** Script option for "leave the text in the script it is stored in". */
export const ORIGINAL_SCRIPT = "original";

/**
 * Every script the converter supports, in the order the menu lists them: the
 * ones an edition is most likely to be stored in first.
 *
 * `label` is the English name, passed to `t()` as the default. The
 * `text.script.*` keys are not in the Tolgee project yet, and a successful CDN
 * fetch that lacks a key renders the key itself rather than falling back to
 * our static data — so without the default the menu reads
 * "text.script.sinhala". Once the keys are added upstream they win.
 */
export const ALL_SCRIPTS = [
  { value: SCRIPTS.RO, labelKey: "text.script.roman", label: "Roman" },
  { value: SCRIPTS.SI, labelKey: "text.script.sinhala", label: "Sinhala" },
  {
    value: SCRIPTS.HI,
    labelKey: "text.script.devanagari",
    label: "Devanagari",
  },
  { value: SCRIPTS.THAI, labelKey: "text.script.thai", label: "Thai" },
  { value: SCRIPTS.MY, labelKey: "text.script.myanmar", label: "Myanmar" },
  { value: SCRIPTS.KM, labelKey: "text.script.khmer", label: "Khmer" },
  { value: SCRIPTS.LAOS, labelKey: "text.script.lao", label: "Lao" },
  { value: SCRIPTS.TIBT, labelKey: "text.script.tibetan", label: "Tibetan" },
  { value: SCRIPTS.BENG, labelKey: "text.script.bengali", label: "Bengali" },
  { value: SCRIPTS.ASSE, labelKey: "text.script.assamese", label: "Assamese" },
  { value: SCRIPTS.GURM, labelKey: "text.script.gurmukhi", label: "Gurmukhi" },
  { value: SCRIPTS.GUJA, labelKey: "text.script.gujarati", label: "Gujarati" },
  { value: SCRIPTS.TELU, labelKey: "text.script.telugu", label: "Telugu" },
  { value: SCRIPTS.KANN, labelKey: "text.script.kannada", label: "Kannada" },
  {
    value: SCRIPTS.MALA,
    labelKey: "text.script.malayalam",
    label: "Malayalam",
  },
  { value: SCRIPTS.THAM, labelKey: "text.script.tai_tham", label: "Tai Tham" },
  { value: SCRIPTS.BRAH, labelKey: "text.script.brahmi", label: "Brahmi" },
  { value: SCRIPTS.CYRL, labelKey: "text.script.cyrillic", label: "Cyrillic" },
] as const;

/**
 * How a transliteration is shown once a script is chosen.
 *
 * `BELOW` keeps the text as the edition stores it and adds the transliteration
 * underneath, so the two can be read against each other; `REPLACE` converts the
 * text in place, for someone who only reads the other script.
 */
export const TRANSLITERATION_MODES = {
  BELOW: "below",
  REPLACE: "replace",
} as const;

export type TransliterationMode =
  (typeof TRANSLITERATION_MODES)[keyof typeof TRANSLITERATION_MODES];

/** Options for the display-mode menu, in the order it lists them. */
export const MODE_OPTIONS = [
  {
    value: TRANSLITERATION_MODES.BELOW,
    labelKey: "text.script.mode_below",
    label: "Below the text",
  },
  {
    value: TRANSLITERATION_MODES.REPLACE,
    labelKey: "text.script.mode_replace",
    label: "Replace the text",
  },
] as const;

/** True when `mode` is a usable value for the display-mode menu. */
export const isTransliterationMode = (mode?: string | null): boolean =>
  mode === TRANSLITERATION_MODES.BELOW ||
  mode === TRANSLITERATION_MODES.REPLACE;

/**
 * Scripts the converter renders correctly but cannot read back.
 *
 * Round-tripping `ro -> script -> ro` loses characters for these three:
 * Tibetan drops every subjoined consonant (`saṅghaṃ` returns as `saṅaྒྷṃ`),
 * Tai Tham loses its medial forms, and Assamese reads `ra` as `va`. They are
 * correct as a target, which is all the reader asks of them; an edition
 * *stored* in one of them converts poorly, and that needs an upstream fix in
 * `pali_script_convertor`.
 */
export const LOSSY_SOURCE_SCRIPTS: readonly string[] = [
  SCRIPTS.TIBT,
  SCRIPTS.THAM,
  SCRIPTS.ASSE,
];

/** Options for the script menu: leave as stored, then every script. */
export const SCRIPT_OPTIONS = [
  {
    value: ORIGINAL_SCRIPT,
    labelKey: "text.script.original",
    label: "Original",
  },
  ...ALL_SCRIPTS,
] as const;

const SCRIPT_CODES = new Set<string>(ALL_SCRIPTS.map((option) => option.value));

/** True when `script` is a script code the converter accepts. */
export const isScriptCode = (script?: string | null): boolean =>
  !!script && SCRIPT_CODES.has(script);

/** True when `script` is a usable value for the script menu. */
export const isSelectableScript = (script?: string | null): boolean =>
  script === ORIGINAL_SCRIPT || isScriptCode(script);

/**
 * Stands in for a run of markup while the surrounding text is converted.
 *
 * The converter passes U+0001 through untouched in every target script, while
 * anything printable — including the digits inside a `{{0}}`-style token, which
 * scripts like Devanagari and Thai localise — is fair game for conversion.
 */
const MARKUP_PLACEHOLDER = "\u0001";

/**
 * Tags and character entities. Segment content arrives as HTML (footnote
 * markers, `<br>` from the line-break transform, search highlights), and the
 * converter has no notion of markup: left in place, `<br>` transliterates to
 * `<බ්‍ර්>` and `&amp;` to `&අම්ප්;`.
 */
const MARKUP_PATTERN =
  /<[^>]*>|&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

const PLACEHOLDER_PATTERN = new RegExp(MARKUP_PLACEHOLDER, "g");

/**
 * Converted content is stable for a given (source, target, content) triple, and
 * a chapter re-renders on every scroll, selection and panel toggle, so results
 * are cached. The cache is bounded and evicts oldest-first; a long reading
 * session loads thousands of segments.
 */
const CACHE_LIMIT = 4000;
const cache = new Map<string, string>();

const readCache = (key: string): string | undefined => {
  const hit = cache.get(key);
  // Re-inserting keeps the entries we keep reading away from the eviction end.
  if (hit !== undefined) {
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
};

const writeCache = (key: string, value: string): string => {
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return value;
};

/** Empties the conversion cache. Exported for tests. */
export const clearTransliterationCache = () => cache.clear();

/**
 * Renders `html` in `targetScript` and leaves its markup intact.
 *
 * `sourceScript` is optional; without it the converter detects the script per
 * character, so an edition that mixes scripts still converts. The reader
 * always leaves it out — only the tests pin a source, to check round-trips.
 *
 * Markup is masked out before conversion and restored afterwards. If the
 * converter drops or duplicates a placeholder — which would silently move a
 * tag — the original is returned rather than markup that no longer matches the
 * text it wrapped.
 */
export const transliterateHtml = (
  html: string,
  targetScript?: string | null,
  sourceScript?: string | null,
): string => {
  if (!html || !isScriptCode(targetScript)) return html;
  const from = isScriptCode(sourceScript) ? sourceScript : null;
  if (from === targetScript) return html;

  const key = `${from ?? "auto"}\u0000${targetScript}\u0000${html}`;
  const cached = readCache(key);
  if (cached !== undefined) return cached;

  const markup: string[] = [];
  const masked = html.replace(MARKUP_PATTERN, (match) => {
    markup.push(match);
    return MARKUP_PLACEHOLDER;
  });

  // Nothing but markup and whitespace. There is no text to convert, and the
  // converter trims a trailing space off whitespace-only input, so skip it.
  if (!/\S/.test(masked.replace(PLACEHOLDER_PATTERN, ""))) return html;

  let converted: string;
  try {
    converted = convertPali(masked, targetScript as string, from);
  } catch {
    // An unconvertible segment should still be readable in its own script.
    return writeCache(key, html);
  }

  const placeholders = converted.match(PLACEHOLDER_PATTERN)?.length ?? 0;
  if (placeholders !== markup.length) return writeCache(key, html);

  let index = 0;
  return writeCache(
    key,
    converted.replace(PLACEHOLDER_PATTERN, () => markup[index++]),
  );
};

/**
 * The font class for content rendered in `targetScript`.
 *
 * Once the text is transliterated the stored language no longer describes what
 * is on screen, so the target script picks the face: Tibetan takes the one we
 * ship, Roman and Cyrillic the serif, and the Indic and Southeast Asian
 * scripts fall back to the system's Noto faces through `.transliterated-text`.
 */
export const getScriptClass = (
  language?: string | null,
  targetScript?: string | null,
): string => {
  if (!isScriptCode(targetScript)) return getLanguageClass(language);
  if (targetScript === SCRIPTS.TIBT) return "bo-text";
  if (targetScript === SCRIPTS.RO || targetScript === SCRIPTS.CYRL) {
    return "en-serif-text";
  }
  return "transliterated-text";
};
