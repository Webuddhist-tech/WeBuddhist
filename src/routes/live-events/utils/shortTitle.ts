/**
 * Tibetan titles carry a printed formula around the name itself: an opening
 * mark (༄༅། ། or ༈), "from the [cycle]:" when the text is part of a larger
 * one, and "…called …, herein contained" (ཞེས་བྱ་བ་བཞུགས་སོ། །) at the end.
 * In a list of the sections of one sadhana every entry repeats them, and the
 * names the reader is looking for are lost inside. This keeps the name.
 */

/** Opening marks, with the shads, tshegs and spaces that follow them. */
const OPENING = /^[\s༁-༊་།-༔]+/u;

/** Shads, tshegs and spaces a title ends on. */
const CLOSING_MARKS = /[\s་།-༔]+$/u;

/** "Herein contained": the colophon of a title page. */
const HEREIN = /(?:་|\s)*བཞུགས(?:་(?:སོ|ས))?$/u;

/** "Called …": ཞེས / ཅེས / ཤེས བྱ་བ, as the final letter before it decides. */
const CALLED = /(?:་|\s)*(?:ཞེས|ཅེས|ཤེས)་བྱ་བ(?:་བཞུགས)?$/u;

/** The topic marker a heading can end on: "As for …". */
const TOPIC = /་ནི$/u;

/**
 * "From [the cycle]:" before the name. Two words that end in ལས are not it:
 * ཕྲིན་ལས (activity) and its spelling འཕྲིན་ལས.
 */
const FROM_CYCLE = /^(.+?)་ལས[།༎]\s*(.+)$/u;
const NOT_FROM = /(?:^|་)འ?ཕྲིན$/u;

const trimClosing = (value: string) => value.replace(CLOSING_MARKS, "");

/**
 * A title with the formula around its name taken off. A title that is all
 * formula, or has none, comes back as it was, trimmed.
 */
export const shortTitle = (title: string | null | undefined): string => {
  const original = (title ?? "").replace(/\s+/g, " ").trim();
  if (!original) return "";

  let name = trimClosing(original.replace(OPENING, ""));
  // Each ending can sit inside the next ("… ཞེས་བྱ་བ་བཞུགས་སོ"), so they are
  // taken off until none is left.
  for (let previous = ""; previous !== name; ) {
    previous = name;
    name = trimClosing(
      name.replace(HEREIN, "").replace(CALLED, "").replace(TOPIC, ""),
    );
  }

  const fromCycle = name.match(FROM_CYCLE);
  if (fromCycle && !NOT_FROM.test(fromCycle[1]) && fromCycle[2].trim()) {
    name = trimClosing(fromCycle[2].trim());
  }

  return name || original;
};
