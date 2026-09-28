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
