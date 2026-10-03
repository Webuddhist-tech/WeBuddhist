import type { ReactNode } from "react";

/** One character lower-cased with its diacritics removed ("Ā" -> "a"). */
const foldChar = (char: string) =>
  char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** A whole string folded the same way, for accent-insensitive matching. */
export const foldForSearch = (value: string) =>
  Array.from(value).map(foldChar).join("");

/**
 * `text` with every accent-insensitive occurrence of `query` wrapped in a
 * <mark>, so "tara" lights up in "Tārā". Built from React nodes rather than
 * an HTML string, since titles come straight from the APIs.
 */
const Highlighted = ({ text, query }: { text: string; query: string }) => {
  const needle = foldForSearch(query.trim());
  if (!needle) return <>{text}</>;

  // Fold character by character, remembering where each folded character came
  // from, so a match in the folded string maps back onto the original.
  const chars = Array.from(text);
  let folded = "";
  const origin: number[] = [];
  chars.forEach((char, index) => {
    for (const piece of foldChar(char)) {
      folded += piece;
      origin.push(index);
    }
  });

  const parts: ReactNode[] = [];
  let cursor = 0;
  let from = folded.indexOf(needle);
  while (from !== -1) {
    const start = origin[from];
    const end = origin[from + needle.length - 1] + 1;
    if (start > cursor) parts.push(chars.slice(cursor, start).join(""));
    parts.push(
      <mark key={start} className="bg-yellow-200 px-0.5 text-inherit">
        {chars.slice(start, end).join("")}
      </mark>,
    );
    cursor = end;
    from = folded.indexOf(needle, from + needle.length);
  }
  if (cursor < chars.length) parts.push(chars.slice(cursor).join(""));
  return <>{parts}</>;
};

export default Highlighted;
