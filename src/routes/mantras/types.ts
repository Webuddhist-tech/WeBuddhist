import type { ImageUrlModel } from "../planviewer/types.ts";

export type AccumulatorMetadataDTO = {
  language: string;
  name: string;
  description?: string | null;
};

export type PresetMantraDTO = {
  id: string;
  mantra: string;
  title?: string | null;
  pronunciation?: string | null;
  audio_url?: string | null;
  mala_image_id?: string | null;
  mala_image_url?: string | null;
};

export type PublicAccumulatorDTO = {
  id: string;
  group_id?: string | null;
  type: string;
  target_count?: number | null;
  current_count: number;
  mantra?: PresetMantraDTO | null;
  mala_image_url?: string | null;
  metadata: AccumulatorMetadataDTO[];
  created_at: string;
  updated_at?: string | null;
};

export type PublicAccumulatorsResponse = {
  accumulators: PublicAccumulatorDTO[];
  total: number;
  skip: number;
  limit: number;
};

export type GroupMetadataDTO = {
  id: string;
  title: string;
  sub_title?: string | null;
  description?: string | null;
  description_long?: string | null;
  language: string;
};

export type AuthorGroupSummaryDTO = {
  id: string;
  slug: string;
  group_type: string;
  is_public: boolean;
  avatar_url?: string | null;
  banner_url?: string | null;
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null;
  tags: string[];
  follower_count: number;
  joiner_count: number;
  member_count: number;
  /** Absent for anonymous callers. */
  is_joined?: boolean | null;
  my_join_request_status?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export type PublicAuthorGroupListResponse = {
  groups: AuthorGroupSummaryDTO[];
  skip: number;
  limit: number;
  total: number;
};

export type PublicAuthorGroupDetailDTO = AuthorGroupSummaryDTO & {
  banner_key?: string | null;
  avatar_key?: string | null;
};

export type GroupAccumulatorDTO = {
  id: string;
  preset_accumulator_id?: string | null;
  group_id: string;
  title?: string | null;
  image?: ImageUrlModel | null;
  target_count?: number | null;
  member_count: number;
  is_joined?: boolean | null;
  created_at: string;
};

export type GroupAccumulatorsResponse = {
  accumulators: GroupAccumulatorDTO[];
  total: number;
  skip: number;
  limit: number;
};

export type GroupAccumulatorDetailDTO = GroupAccumulatorDTO & {
  total_count: number;
  total_today_count: number;
};

export type MemberProfileDTO = {
  username?: string | null;
  fullname: string;
  avatar_url?: string | null;
};

export type AuthorGroupMembersListResponse = {
  total_members: number;
  list: MemberProfileDTO[];
  skip: number;
  limit: number;
};

export type GroupAccumulatorMemberDTO = MemberProfileDTO & {
  user_id: string;
  joined_at: string;
  total_count: number;
  today_count: number;
};

export type GroupAccumulatorMembersResponse = {
  members: GroupAccumulatorMemberDTO[];
  member_count: number;
  total: number;
  skip: number;
  limit: number;
};

export type PaginatedMembersResult<T> = {
  items: T[];
  total: number;
};
