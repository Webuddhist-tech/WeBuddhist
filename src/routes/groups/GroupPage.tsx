import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import {
  getLanguageClass,
  mapLanguageCode,
} from "../../utils/helperFunctions.tsx";
import { tolgeeToPlanLanguage } from "../planviewer/utils/seriesUtils.ts";
import {
  normalizeLang,
  normalizeMetadata,
} from "../mantras/utils/metadataUtils.ts";
import { getMemberInitials } from "../mantras/utils/groupUtils.ts";
import { fetchGroupMembersPage } from "../mantras/api/accumulatorApi.ts";
import { useInfiniteMembers } from "../mantras/hooks/useInfiniteMembers.ts";
import { InfiniteMemberList } from "../mantras/components/InfiniteMemberList.tsx";
import type { GroupMetadataDTO } from "../mantras/types.ts";
import EventDescriptionMarkdown from "../live-events/components/EventDescriptionMarkdown.tsx";
import LiveEventCard from "../live-events/components/LiveEventCard.tsx";
import {
  safeExternalUrl,
  sortByPhaseThenTime,
} from "../live-events/utils/eventUtils.ts";
import {
  fetchGroupDetail,
  fetchGroupEvents,
  fetchGroupPractices,
  GroupNotFoundError,
  resolveGroupId,
} from "./api/groupsApi.ts";
import GroupPosts from "./components/GroupPosts.tsx";
import GroupPractices from "./components/GroupPractices.tsx";
import GroupSocialLinks from "./components/GroupSocialLinks.tsx";
import {
  groupAddress,
  hasSlugAddress,
  parseGroupHandle,
} from "./utils/groupHandle.ts";
import type { GroupHandle } from "./utils/groupHandle.ts";

/** Past this length the About section opens folded, a few paragraphs in. */
const ABOUT_CLAMP_CHARS = 1200;

/** Faces shown beside the member count in the header. */
const MEMBER_PREVIEW_COUNT = 2;

const handleKey = (handle: GroupHandle | null) =>
  !handle ? "" : "slug" in handle ? `@${handle.slug.toLowerCase()}` : handle.id;

/** The metadata row for the reader's language, then English, then any. */
const metadataFor = (
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null | undefined,
  language: ReturnType<typeof tolgeeToPlanLanguage>,
): GroupMetadataDTO | null => {
  const rows = normalizeMetadata(metadata);
  return (
    rows.find((row) => normalizeLang(String(row.language)) === language) ??
    rows.find((row) => normalizeLang(String(row.language)) === "EN") ??
    rows[0] ??
    null
  );
};

/** A group that is not there, as opposed to one that failed to load. */
const isMissing = (error: unknown) =>
  error instanceof GroupNotFoundError ||
  (isAxiosError(error) && [404, 422].includes(error.response?.status ?? 0));

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section aria-labelledby={id} className="space-y-4">
    <h2
      id={id}
      className="text-sm font-semibold uppercase tracking-wide text-slate-500"
    >
      {title}
    </h2>
    {children}
  </section>
);

const GroupSkeleton = () => (
  <div className="space-y-6">
    <div className="aspect-[3/1] w-full animate-pulse rounded-3xl bg-slate-100 sm:aspect-[4/1]" />
    <div className="flex items-end gap-4 px-4 sm:px-8">
      <div className="-mt-14 size-24 animate-pulse rounded-full bg-slate-200 ring-4 ring-white sm:size-32" />
      <div className="h-8 w-1/2 animate-pulse rounded bg-slate-100" />
    </div>
    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
  </div>
);

/**
 * A group's page, at `/spaces/@{slug}`: who they are, what they practise,
 * when they gather, what they have posted, and who belongs - everything the
 * app shows about a group, on one page anyone can open from a link.
 *
 * A link that knows only the group's id lands on `/spaces/{id}`, and the page
 * moves the address to the `@slug` form once the group is known.
 */
const GroupPage = () => {
  const { handle: rawHandle } = useParams<{ handle: string }>();
  const handle = useMemo(() => parseGroupHandle(rawHandle), [rawHandle]);
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = mapLanguageCode(storedLanguage);
  const planLanguage = tolgeeToPlanLanguage(storedLanguage);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: groupId,
    isLoading: isResolving,
    error: resolveError,
  } = useQuery(
    ["group-id", handleKey(handle)],
    () => resolveGroupId(handle as GroupHandle),
    {
      enabled: handle !== null,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
  } = useQuery(
    ["group", groupId, apiLanguage],
    () => fetchGroupDetail(groupId as string, apiLanguage),
    { enabled: Boolean(groupId), refetchOnWindowFocus: false, retry: 1 },
  );

  // Settle on the `@slug` address - for a group it can be opened at again.
  // A slug is looked up in the public listing, so a private or unpublished
  // group keeps the id address it was reached by: its slug would load only
  // until the page is reloaded or shared. The slug's lookup is primed with
  // the id already in hand, so the move itself costs no request.
  useEffect(() => {
    if (!group?.slug || !groupId || !handle) return;
    if (!hasSlugAddress(group)) return;
    if (
      "slug" in handle &&
      handle.slug.toLowerCase() === group.slug.toLowerCase()
    )
      return;
    queryClient.setQueryData(
      ["group-id", handleKey({ slug: group.slug })],
      groupId,
    );
    navigate(groupAddress(group), { replace: true });
  }, [group, groupId, handle, navigate, queryClient]);

  const { data: practicesData } = useQuery(
    ["group-practices", groupId, apiLanguage],
    () => fetchGroupPractices(groupId as string, apiLanguage),
    { enabled: Boolean(groupId), refetchOnWindowFocus: false },
  );

  const { data: eventsData } = useQuery(
    ["group-events", groupId, apiLanguage],
    () => fetchGroupEvents(groupId as string, apiLanguage),
    { enabled: Boolean(groupId), refetchOnWindowFocus: false },
  );

  const members = useInfiniteMembers({
    queryKey: ["group-members", groupId ?? ""],
    fetchPage: (skip, limit) =>
      fetchGroupMembersPage(groupId as string, skip, limit),
    enabled: Boolean(groupId),
  });

  // A banner or avatar link that has expired is dropped rather than shown
  // broken; they are presigned.
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const imageOk = (url: string | null) =>
    url && !failedImages.includes(url) ? url : null;
  const dropImage = (url: string | null) => () =>
    url && setFailedImages((failed) => [...failed, url]);

  // A long history would push the posts a few screens down; it opens on
  // request instead.
  const [aboutOpen, setAboutOpen] = useState(false);

  const error = resolveError || groupError;
  if (handle === null || error) {
    const message =
      handle === null || isMissing(error)
        ? t("group_page.not_found")
        : t("group_page.load_failed");
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
        <Seo
          title={`${message} | ${siteName}`}
          description={message}
          canonical=""
        />
        <p className="text-base text-slate-600">{message}</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-[#102544] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3a67]"
        >
          {t("group_page.back_home")}
        </Link>
      </div>
    );
  }

  if (isResolving || isGroupLoading || !group) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <GroupSkeleton />
      </div>
    );
  }

  const metadata = metadataFor(group.metadata, planLanguage);
  const title = metadata?.title?.trim() || t("group_page.untitled");
  const fontClass = getLanguageClass(metadata?.language || apiLanguage);
  const aboutText = metadata?.description_long?.trim() ?? "";
  const aboutIsLong = aboutText.length > ABOUT_CLAMP_CHARS;
  const aboutClamped = aboutIsLong && !aboutOpen;
  const bannerUrl = imageOk(safeExternalUrl(group.banner_url));
  const avatarUrl = imageOk(safeExternalUrl(group.avatar_url));
  const practices = practicesData?.practices ?? [];
  const events = sortByPhaseThenTime(eventsData?.events ?? []);
  const tags = (group.tags ?? []).filter((tag) => tag?.trim());
  const count = (value: number) => value.toLocaleString(storedLanguage);
  const memberCount = group.joiner_count ?? 0;
  // Members are listed to joiners only on a private group; then only the
  // number shows.
  const previewMembers = members.members.slice(0, MEMBER_PREVIEW_COUNT);
  const otherMemberCount = Math.max(memberCount - previewMembers.length, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <Seo
        title={`${title} | ${siteName}`}
        description={metadata?.description?.trim() || title}
        canonical={`${window.location.origin}${groupAddress(group)}`}
      />

      <header>
        <div className="aspect-[3/1] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-rose-50 to-[#eef2f7] sm:aspect-[4/1]">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt=""
              onError={dropImage(bannerUrl)}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-end sm:gap-6 sm:px-8">
          <div className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-semibold text-[#102544] ring-4 ring-white shadow-sm sm:-mt-16 sm:size-32">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                onError={dropImage(avatarUrl)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden>{getMemberInitials(title)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {/* Only a page is labelled; "community" is the default and
                  says nothing a visitor needs. */}
              {group.group_type === "PAGE" && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {t("group_page.type_page")}
                </span>
              )}
              {!group.is_public && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  {t("group_page.private")}
                </span>
              )}
            </div>
            <h1
              className={`mt-1 text-balance text-3xl font-semibold leading-tight tracking-tight text-[#102544] sm:text-4xl ${fontClass}`}
            >
              {title}
            </h1>
            {metadata?.sub_title?.trim() && (
              <p className={`mt-1 text-base text-slate-600 ${fontClass}`}>
                {metadata.sub_title.trim()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <div className="flex gap-1.5">
              <dt className="sr-only">{t("group_page.members")}</dt>
              <dd>
                {/* The first members' faces, then how many more; it leads to
                    the full list beside the posts. */}
                {previewMembers.length > 0 ? (
                  <a
                    href="#group-members"
                    className="flex items-center gap-2 transition hover:text-[#102544]"
                  >
                    <span className="flex -space-x-2">
                      {previewMembers.map((member, index) => (
                        <Avatar
                          key={member.username ?? `${member.fullname}-${index}`}
                          className="size-8 ring-2 ring-white"
                        >
                          {member.avatar_url ? (
                            <AvatarImage src={member.avatar_url} alt="" />
                          ) : null}
                          <AvatarFallback className="bg-amber-50 text-xs text-amber-800">
                            {getMemberInitials(member.fullname)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </span>
                    <span>
                      {otherMemberCount > 0
                        ? t("group_page.members_more", {
                            count: count(otherMemberCount),
                          })
                        : t("group_page.members_count", {
                            count: count(memberCount),
                          })}
                    </span>
                  </a>
                ) : (
                  t("group_page.members_count", { count: count(memberCount) })
                )}
              </dd>
            </div>
          </dl>
          <GroupSocialLinks links={group.social_links ?? []} />
        </div>

        {metadata?.description?.trim() && (
          <p
            className={`mt-5 max-w-3xl px-4 text-base leading-7 text-slate-700 sm:px-8 ${fontClass}`}
          >
            {metadata.description.trim()}
          </p>
        )}

        {tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2 px-4 sm:px-8">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
        <div className="min-w-0 space-y-12">
          {events.length > 0 && (
            <Section id="group-events" title={t("group_page.events")}>
              <ul className="grid gap-5 sm:grid-cols-2">
                {events.map((event) => (
                  <li key={event.id}>
                    <LiveEventCard
                      event={event}
                      language={apiLanguage}
                      locale={storedLanguage}
                    />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {practices.length > 0 && (
            <Section id="group-practices" title={t("group_page.practices")}>
              <GroupPractices
                groupId={group.id}
                practices={practices}
                apiLanguage={apiLanguage}
                locale={storedLanguage}
              />
            </Section>
          )}

          {aboutText && (
            <Section id="group-about" title={t("group_page.about")}>
              <div
                className={`rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-900/5 sm:p-8 ${fontClass}`}
              >
                <div
                  id="group-about-text"
                  className={
                    aboutClamped
                      ? "relative max-h-[24rem] overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-24 after:bg-gradient-to-t after:from-slate-50"
                      : undefined
                  }
                >
                  <EventDescriptionMarkdown content={aboutText} />
                </div>
                {aboutIsLong && (
                  <button
                    type="button"
                    onClick={() => setAboutOpen((open) => !open)}
                    aria-expanded={aboutOpen}
                    aria-controls="group-about-text"
                    className="mt-4 text-sm font-semibold text-[#1b3a67] underline decoration-slate-300 underline-offset-4 transition hover:decoration-[#1b3a67]"
                  >
                    {aboutOpen
                      ? t("group_page.read_less")
                      : t("group_page.read_more")}
                  </button>
                )}
              </div>
            </Section>
          )}

          <Section id="group-posts" title={t("group_page.posts")}>
            <GroupPosts
              groupId={group.id}
              groupName={title}
              avatarUrl={avatarUrl}
              locale={storedLanguage}
            />
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Section id="group-members" title={t("group_page.members")}>
            {/* Members load as the list is scrolled, so it scrolls on its
                own rather than stretching the page by a thousand rows. */}
            <div className="max-h-[32rem] overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100vh-10rem)]">
              <InfiniteMemberList
                members={members.members.map((member) => ({
                  fullname: member.fullname,
                  username: member.username,
                  avatarUrl: member.avatar_url,
                }))}
                total={members.total}
                isLoading={members.isLoading}
                isFetchingNextPage={members.isFetchingNextPage}
                sentinelRef={members.sentinelRef}
                emptyMessage={t("group_page.no_members")}
              />
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
};

export default GroupPage;
