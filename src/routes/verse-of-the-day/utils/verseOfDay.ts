/**
 * Verses arrive as one string with their source appended after a tilde -
 * "…the way to recovery.\n\n  ~Gaṇḍavyūhasūtra" - so pull the two apart to
 * set the source as its own reference line under the quote.
 */
export function splitVerseSource(text: string): {
  body: string;
  source: string;
} {
  const tilde = text.lastIndexOf("~");
  if (tilde === -1) return { body: text.trim(), source: "" };
  return {
    body: text.slice(0, tilde).trim(),
    source: text.slice(tilde + 1).trim(),
  };
}

/** A local calendar date as `YYYY-MM-DD`, the form the API filters on. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `count` consecutive days ending on `isoDate`, newest first. */
export function daysEndingOn(isoDate: string, count: number): string[] {
  const anchor = new Date(`${isoDate}T12:00:00`);
  return Array.from({ length: count }, (_, offset) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() - offset);
    return toIsoDate(day);
  });
}

/**
 * "October 3, 2026", in the site language (an API code: en, bo or zh).
 * Browsers ship no Tibetan date names, so Tibetan is spelled out here as
 * year, month and day: "2026 ཟླ་10 ཚེས་3".
 */
export function formatVerseDate(isoDate: string, language = "en"): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (language === "bo") {
    return `${date.getFullYear()} ཟླ་${date.getMonth() + 1} ཚེས་${date.getDate()}`;
  }
  return date.toLocaleDateString(language === "zh" ? "zh-CN" : undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
