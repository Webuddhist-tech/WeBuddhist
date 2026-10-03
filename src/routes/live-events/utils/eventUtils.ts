import type {
  EventDTO,
  EventImageSize,
  EventMetadataDTO,
  EventMetadataResponse,
} from "../types.ts";
import {
  EXCERPT_MARKDOWN_PARSE_LIMIT,
  markdownToPlainText,
} from "./descriptionMarkdown.ts";

/**
 * Where an event sits relative to now.
 *
 * The backend has no `is_live` flag, so this is derived from the event's own
 * window. `start_date` and `end_date` are timezone-aware on the server and
 * serialize with an offset, so comparing them as instants is correct wherever
 * the visitor happens to be - the event's `timezone` is for display only.
 */
export type EventPhase = "live" | "upcoming" | "past";

export const eventPhase = (
  event: EventDTO,
  now: Date = new Date(),
): EventPhase => {
  const start = new Date(event.start_date).getTime();
  const end = new Date(event.end_date).getTime();
  const at = now.getTime();

  // An unparseable date should not claim to be live.
  if (Number.isNaN(start) || Number.isNaN(end)) return "upcoming";
  if (at < start) return "upcoming";
  if (at > end) return "past";
  return "live";
};

const PHASE_ORDER: Record<EventPhase, number> = {
  live: 0,
  upcoming: 1,
  past: 2,
};

/**
 * Live events first, then what is coming up soonest, then what has finished
 * most recently. Featured order from the API is not chronological, and a page
 * called Live Events that buries the live one reads as broken.
 */
export const sortByPhaseThenTime = (
  events: EventDTO[],
  now: Date = new Date(),
): EventDTO[] =>
  [...events].sort((a, b) => {
    const phaseA = eventPhase(a, now);
    const phaseB = eventPhase(b, now);
    if (phaseA !== phaseB) return PHASE_ORDER[phaseA] - PHASE_ORDER[phaseB];

    const startA = new Date(a.start_date).getTime();
    const startB = new Date(b.start_date).getTime();
    if (Number.isNaN(startA) || Number.isNaN(startB)) return 0;
    // Past events read best newest-first; everything else soonest-first.
    return phaseA === "past" ? startB - startA : startA - startB;
  });

const metadataList = (metadata: EventMetadataResponse): EventMetadataDTO[] => {
  if (!metadata) return [];
  return Array.isArray(metadata) ? metadata : [metadata];
};

/**
 * The metadata entry for a language, falling back to English and then to
 * whatever the event has. An event titled only in Tibetan should still show
 * its Tibetan title to an English reader rather than nothing.
 */
export const metadataForLanguage = (
  metadata: EventMetadataResponse,
  language: string,
): EventMetadataDTO | null => {
  const entries = metadataList(metadata);
  if (entries.length === 0) return null;

  const wanted = language.trim().toLowerCase().split("-")[0];
  const match = entries.find(
    (entry) => entry.language?.trim().toLowerCase().split("-")[0] === wanted,
  );
  if (match) return match;

  const english = entries.find(
    (entry) => entry.language?.trim().toLowerCase().split("-")[0] === "en",
  );
  return english ?? entries[0];
};

export const eventTitle = (event: EventDTO, language: string): string =>
  metadataForLanguage(event.metadata, language)?.name?.trim() || "";

export const eventDescription = (event: EventDTO, language: string): string =>
  metadataForLanguage(event.metadata, language)?.description?.trim() || "";

/**
 * Plain text for list-card excerpts. Full Markdown is rendered on the detail
 * page; cards only need a readable snippet without markup syntax showing.
 */
export const stripMarkdownForExcerpt = (markdown: string): string => {
  const text = markdown.trim();
  if (!text) return "";

  const bounded =
    text.length > EXCERPT_MARKDOWN_PARSE_LIMIT
      ? text.slice(0, EXCERPT_MARKDOWN_PARSE_LIMIT)
      : text;

  return markdownToPlainText(bounded);
};

export const truncateExcerpt = (text: string, maxLength = 160): string => {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trim()}…`;
};

export const eventDescriptionExcerpt = (
  event: EventDTO,
  language: string,
  maxLength = 160,
): string => {
  const raw = eventDescription(event, language);
  if (!raw) return "";
  return truncateExcerpt(stripMarkdownForExcerpt(raw), maxLength);
};

/** The language of the entry actually shown, for picking the right font class. */
export const eventTitleLanguage = (event: EventDTO, language: string): string =>
  metadataForLanguage(event.metadata, language)?.language || language;

const IMAGE_SIZES: EventImageSize[] = ["medium", "original", "thumbnail"];

/**
 * The event's artwork, as a link a browser can load.
 *
 * `image_url` is the artwork's storage key ("images/plan_images/…"), not a
 * link: handed to an `<img>` it resolves against this site and loads the
 * app's own page instead. The links are on `image`, one per size - the size
 * asked for first, then the others. `image_url` is only taken if it ever
 * arrives as a link, and the series' artwork stands in when the event has
 * none of its own.
 */
export const eventImageUrl = (
  event: EventDTO,
  size: EventImageSize = "medium",
): string | null => {
  for (const candidate of [size, ...IMAGE_SIZES]) {
    const url = safeExternalUrl(event.image?.[candidate]);
    if (url) return url;
  }
  return (
    safeExternalUrl(event.image_url) ?? safeExternalUrl(event.series?.image_url)
  );
};

/**
 * The YouTube video id in any of the shapes an organizer might paste: a watch
 * link, a short youtu.be link, an embed link, or a live URL. Returns null for
 * anything else, so a Vimeo or Zoom link is offered as a plain link instead of
 * being forced into a YouTube iframe.
 */
export const youtubeVideoId = (url: string): string | null => {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const idPattern = /^[\w-]{11}$/;

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return idPattern.test(id) ? id : null;
  }

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "youtube-nocookie.com"
  ) {
    return null;
  }

  const queryId = parsed.searchParams.get("v");
  if (queryId && idPattern.test(queryId)) return queryId;

  // /embed/<id>, /live/<id>, /v/<id>, /shorts/<id>
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (
    segments.length >= 2 &&
    ["embed", "live", "v", "shorts"].includes(segments[0])
  ) {
    return idPattern.test(segments[1]) ? segments[1] : null;
  }

  return null;
};

/**
 * An organizer-supplied URL, or null when it is not one a browser can safely
 * follow. Event links and stream URLs are typed by whoever created the event,
 * and a `javascript:` or `data:` href would run in this page's origin for
 * anyone who clicks it - so only absolute http(s) URLs are handed to an anchor.
 */
export const safeExternalUrl = (
  url: string | null | undefined,
): string | null => {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Not absolute, so there is no scheme to vouch for.
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // The parsed form is what was actually checked; the raw string may carry
  // characters the URL parser strips on its way to a different scheme.
  return parsed.href;
};

/** nocookie host: this page embeds third-party video on an otherwise first-party page. */
export const youtubeEmbedUrl = (url: string): string | null => {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
};

/**
 * The video to feature, preferring one in the reader's language. Organizers add
 * one stream per language for the same puja, so picking the first would show a
 * Tibetan reader the English overlay.
 */
export const preferredVideo = (event: EventDTO, language: string) => {
  const videos = [...(event.youtube ?? [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  if (videos.length === 0) return null;

  const wanted = language.trim().toLowerCase().split("-")[0];
  return (
    videos.find(
      (video) => video.language?.trim().toLowerCase().split("-")[0] === wanted,
    ) ??
    videos.find(
      (video) => video.language?.trim().toLowerCase().split("-")[0] === "en",
    ) ??
    videos[0]
  );
};

/**
 * The event's `timezone`, but only when `Intl` recognises it. The value comes
 * from whoever created the event, and an unknown zone makes `Intl` throw - so
 * an unusable one falls back to the reader's own zone rather than taking the
 * page down.
 */
const usableTimeZone = (timezone?: string | null): string | undefined => {
  const trimmed = timezone?.trim();
  if (!trimmed) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    return undefined;
  }
};

/**
 * The event's window, in the event's own timezone when it declares one.
 *
 * An event that says it starts at 10:00 in Asia/Kathmandu has to read as 10:00
 * next to that label, or the two contradict each other for every reader outside
 * that zone. The offset is appended so the time is not silently foreign.
 *
 * A single-day event collapses to one date and a time range; anything longer
 * spells out both ends, because "10:00 - 14:00" across a three-day retreat
 * tells the reader nothing.
 */
export const formatEventWindow = (event: EventDTO, locale: string): string => {
  const timeZone = usableTimeZone(event.timezone);
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  if (Number.isNaN(start.getTime())) return "";

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  };
  // Named once, on the closing value, so a range does not repeat the offset.
  const zonedTimeOptions: Intl.DateTimeFormatOptions = timeZone
    ? { ...timeOptions, timeZoneName: "short" }
    : timeOptions;
  // A multi-day range prints no clock, so the zone has to ride on the date
  // instead: these are the event's local dates, and an event that opens near
  // midnight lands on a different date than the reader's own calendar shows.
  const zonedDateOptions: Intl.DateTimeFormatOptions = timeZone
    ? { ...dateOptions, timeZoneName: "short" }
    : dateOptions;

  // "Same day" has to be judged in the zone being rendered, or an evening
  // event splits across two dates for a reader the other side of midnight.
  const dayKey = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(date);

  const sameDay = !Number.isNaN(end.getTime()) && dayKey(start) === dayKey(end);

  if (sameDay) {
    return `${start.toLocaleDateString(locale, dateOptions)} · ${start.toLocaleTimeString(
      locale,
      timeOptions,
    )} – ${end.toLocaleTimeString(locale, zonedTimeOptions)}`;
  }

  if (Number.isNaN(end.getTime())) {
    return `${start.toLocaleDateString(locale, dateOptions)} · ${start.toLocaleTimeString(locale, zonedTimeOptions)}`;
  }

  return `${start.toLocaleDateString(locale, dateOptions)} – ${end.toLocaleDateString(
    locale,
    zonedDateOptions,
  )}`;
};

export const locationLabel = (event: EventDTO): string => {
  const parts = [
    event.location?.name,
    event.location?.city,
    event.location?.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.join(", ");
};
