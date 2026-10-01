/**
 * The slice of the backend's `EventDTO` this feature reads. The DTO carries a
 * good deal more (reminders, accumulators, recurrence); anything not rendered
 * here is left out rather than mirrored, so the shape says what the pages use.
 */

export type EventMetadataDTO = {
  id: string;
  name: string;
  description?: string | null;
  language: string;
};

/** `metadata` comes back as one entry, a list, or nothing at all. */
export type EventMetadataResponse =
  | EventMetadataDTO
  | EventMetadataDTO[]
  | null
  | undefined;

export type EventYoutubeDTO = {
  id: string;
  url: string;
  label?: string | null;
  language: string;
  display_order: number;
};

export type EventLinkDTO = {
  id: string;
  url: string;
  label?: string | null;
  link_type?: string | null;
  display_order?: number;
};

export type LocationDTO = {
  id: string;
  name?: string | null;
  city?: string | null;
  country?: string | null;
};

export type EventFormat = "online" | "offline" | "hybrid";

export type EventDTO = {
  id: string;
  group_id: string;
  start_date: string;
  end_date: string;
  timezone?: string | null;
  is_one_day: boolean;
  featured: boolean;
  is_recurring?: boolean;
  occurrence_date?: string | null;
  event_format?: EventFormat;
  chat_enabled?: boolean;
  metadata: EventMetadataResponse;
  youtube?: EventYoutubeDTO[];
  links?: EventLinkDTO[];
  location?: LocationDTO | null;
  image_url?: string | null;
  image?: { url?: string | null } | null;
  group_name?: string | null;
  group_avatar_url?: string | null;
  participant_count?: number;
  /** Null when the caller is not signed in. */
  is_joined?: boolean | null;
};

/**
 * Where the operator has the room, as the live socket's `position` frame
 * carries it. The socket sends a position, never text: `segment_id` is the key
 * the page resolves against the liturgy it has loaded, and `text_id` says
 * which liturgy that is, so a change of text is a cue to load the next one.
 */
export type LiveRecitationPosition = {
  text_id: string;
  segment_id: string;
  /** Advisory only, kept for the OBS overlays - never keyed off here. */
  index?: number | null;
  /** Set during repeated passages, where the segment id alone is ambiguous. */
  round_number?: number | null;
  /** Orders frames; increases with every position in the event. */
  revision?: number | null;
};

export type RecitationSegmentDTO = { id: string; content: string };

/** One line of a liturgy, keyed by language within each kind of rendering. */
export type RecitationRowDTO = {
  recitation?: Record<string, RecitationSegmentDTO>;
  translations?: Record<string, RecitationSegmentDTO>;
  transliterations?: Record<string, RecitationSegmentDTO>;
  adaptations?: Record<string, RecitationSegmentDTO>;
};

export type RecitationTextDTO = {
  text_id: string;
  title: string;
  segments: RecitationRowDTO[];
};

/** A loaded liturgy, with the language its recited line is in. */
export type LiveRecitationText = RecitationTextDTO & { language: string };
