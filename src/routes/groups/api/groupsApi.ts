import axiosInstance from "../../../config/axios-config.ts";
import type { PublicAuthorGroupListResponse } from "../../mantras/types.ts";
import type {
  GroupDetailDTO,
  GroupEventsResponse,
  GroupFeedResponse,
  GroupPostsResponse,
  GroupPracticesResponse,
} from "../types.ts";
import type { GroupHandle } from "../utils/groupHandle.ts";

/** Both kinds of public group; the listing returns one kind per request. */
const GROUP_TYPES = ["COMMUNITY", "PAGE"] as const;

/** The listing's largest page. */
const LIST_PAGE_SIZE = 100;

export class GroupNotFoundError extends Error {
  constructor(handle: GroupHandle) {
    super(
      `No public group ${"slug" in handle ? `@${handle.slug}` : handle.id}`,
    );
    this.name = "GroupNotFoundError";
  }
}

/**
 * The id behind a group's slug, or null when no public group has it.
 *
 * The API looks a group up by id alone, and its search matches titles and
 * descriptions rather than slugs, so the public listing is walked until the
 * slug turns up. There are a few dozen groups, so this is one request in
 * practice. Only published public groups are listed: a private group is
 * reached by its id.
 */
export const findGroupIdBySlug = async (
  slug: string,
): Promise<string | null> => {
  const wanted = slug.toLowerCase();

  for (const groupType of GROUP_TYPES) {
    for (let skip = 0; ; skip += LIST_PAGE_SIZE) {
      const { data } = await axiosInstance.get<PublicAuthorGroupListResponse>(
        "/api/v1/author/groups",
        { params: { group_type: groupType, limit: LIST_PAGE_SIZE, skip } },
      );
      const groups = data.groups ?? [];
      const match = groups.find(
        (group) => group.slug?.toLowerCase() === wanted,
      );
      if (match) return match.id;
      if (groups.length < LIST_PAGE_SIZE || skip + groups.length >= data.total)
        break;
    }
  }
  return null;
};

/** The id of the group a URL names, by `@slug` or by id. */
export const resolveGroupId = async (handle: GroupHandle): Promise<string> => {
  const groupId =
    "id" in handle ? handle.id : await findGroupIdBySlug(handle.slug);
  if (!groupId) throw new GroupNotFoundError(handle);
  return groupId;
};

export const fetchGroupDetail = async (
  groupId: string,
  language: string,
): Promise<GroupDetailDTO> => {
  const { data } = await axiosInstance.get<GroupDetailDTO>(
    `/api/v1/author/groups/${encodeURIComponent(groupId)}`,
    { params: { language } },
  );
  return data;
};

/** Series, mantra accumulations and recitation collections, newest first. */
export const fetchGroupPractices = async (
  groupId: string,
  language: string,
  limit = 50,
): Promise<GroupPracticesResponse> => {
  const { data } = await axiosInstance.get<GroupPracticesResponse>(
    `/api/v1/author/groups/${encodeURIComponent(groupId)}/practices`,
    { params: { language, limit, skip: 0 } },
  );
  return data;
};

export const fetchGroupEvents = async (
  groupId: string,
  language: string,
  limit = 50,
): Promise<GroupEventsResponse> => {
  const { data } = await axiosInstance.get<GroupEventsResponse>(
    "/api/v1/events",
    { params: { group_id: groupId, language, limit, skip: 0 } },
  );
  return data;
};

export const fetchGroupPostsPage = async (
  groupId: string,
  skip: number,
  limit: number,
): Promise<GroupPostsResponse> => {
  const { data } = await axiosInstance.get<GroupPostsResponse>(
    `/api/v1/groups/author/${encodeURIComponent(groupId)}/posts`,
    { params: { skip, limit } },
  );
  return data;
};

/**
 * The newest posts and events across every public group, newest first - one
 * request that says which groups have been active lately.
 */
export const fetchGroupActivityFeed = async (
  language: string,
  limit = 100,
): Promise<GroupFeedResponse> => {
  const { data } = await axiosInstance.get<GroupFeedResponse>(
    "/api/v1/author/groups/feeds",
    { params: { include_unfollowed: true, language, limit, skip: 0 } },
  );
  return data;
};
