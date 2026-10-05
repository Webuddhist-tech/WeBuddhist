import type { ImageUrlModel } from "../planviewer/types.ts";
import type {
  GroupAccumulatorDTO,
  GroupMetadataDTO,
  PublicAuthorGroupDetailDTO,
} from "../mantras/types.ts";
import type { EventDTO } from "../live-events/types.ts";

/**
 * The slices of the backend's group payloads the group page reads. Anything
 * not rendered is left out rather than mirrored.
 */

export type GroupSocialLinkDTO = {
  id: string;
  /** youtube, website, facebook, instagram, x, … - free text from Studio. */
  platform: string;
  url: string;
};

export type GroupDetailDTO = PublicAuthorGroupDetailDTO & {
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null;
  social_links?: GroupSocialLinkDTO[];
  /** PAGE groups are a teacher or a text; COMMUNITY groups gather people. */
  group_type: "COMMUNITY" | "PAGE" | string;
  /** DRAFT until Studio publishes it; only published groups are listed. */
  status?: string;
};

export type GroupSeriesDTO = {
  id: string;
  metadata?: {
    title?: string | null;
    sub_title?: string | null;
    description?: string | null;
    language?: string | null;
  } | null;
  image?: ImageUrlModel | null;
  plan_count?: number | null;
  total_days?: number | null;
};

export type GroupCollectionDTO = {
  id: string;
  group_id: string;
  name: string;
  img_url?: string | null;
  item_count: number;
};

export type GroupPracticeDTO =
  | { type: "series"; series: GroupSeriesDTO }
  | { type: "accumulator"; accumulator: GroupAccumulatorDTO }
  | { type: "collection"; collection: GroupCollectionDTO };

export type GroupPracticesResponse = {
  practices: GroupPracticeDTO[];
  total: number;
  skip: number;
  limit: number;
};

export type GroupEventsResponse = {
  events: EventDTO[];
  total: number;
  skip: number;
  limit: number;
};

export type GroupPostMediaDTO = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | string;
  url: string;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  display_order?: number | null;
};

export type GroupPostLinkDTO = {
  id?: string;
  url: string;
  title?: string | null;
};

export type GroupPostDTO = {
  id: string;
  caption?: string | null;
  published_at?: string | null;
  created_at: string;
  media?: GroupPostMediaDTO[];
  links?: GroupPostLinkDTO[];
  creator_name?: string | null;
  like_count?: number;
  comment_count?: number;
};

export type GroupPostsResponse = {
  posts: GroupPostDTO[];
  total: number;
  skip: number;
  limit: number;
};

/** One entry of the cross-group feed: a post or an event, tagged with its group. */
export type GroupFeedItemDTO = {
  type: "post" | "event";
  feed_at: string;
  group_id: string;
  post?: GroupPostDTO | null;
  event?: EventDTO | null;
};

export type GroupFeedResponse = {
  items: GroupFeedItemDTO[];
  total: number;
  skip: number;
  limit: number;
};
