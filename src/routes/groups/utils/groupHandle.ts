/**
 * How a group is named in its URL.
 *
 * Its address is `/spaces/@{slug}` - the handle the group's admins chose in
 * Studio. Pages that only know the group's id (an event carries `group_id`
 * and a display name, never the slug) link to `/spaces/{id}` instead, and the
 * group page settles on the `@slug` form once it has loaded.
 */
export type GroupHandle = { slug: string } | { id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseGroupHandle = (
  raw: string | null | undefined,
): GroupHandle | null => {
  const value = decodeURIComponent(raw ?? "").trim();
  if (value.startsWith("@")) {
    const slug = value.slice(1).trim();
    return slug ? { slug } : null;
  }
  return UUID.test(value) ? { id: value.toLowerCase() } : null;
};

export const groupPath = (slug: string): string =>
  `/spaces/@${encodeURIComponent(slug)}`;

/** For a page that knows the group only by id; see the note above. */
export const groupPathById = (groupId: string): string =>
  `/spaces/${encodeURIComponent(groupId)}`;

/**
 * Whether the group's `@slug` address can be opened afresh. A slug is looked
 * up in the public listing, which carries only published public groups; any
 * other group is found by its id alone, so that is the address it keeps.
 */
export const hasSlugAddress = (group: {
  is_public: boolean;
  status?: string | null;
}): boolean =>
  group.is_public && (group.status == null || group.status === "PUBLISHED");

/** The address a group can always be opened at again. */
export const groupAddress = (group: {
  id: string;
  slug: string;
  is_public: boolean;
  status?: string | null;
}): string =>
  hasSlugAddress(group) ? groupPath(group.slug) : groupPathById(group.id);
