import { useInfiniteQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { FaRegComment, FaRegHeart } from "react-icons/fa6";
import { Skeleton } from "@/components/ui/skeleton";
import { safeExternalUrl } from "../../live-events/utils/eventUtils.ts";
import { fetchGroupPostsPage } from "../api/groupsApi.ts";
import type { GroupPostDTO, GroupPostMediaDTO } from "../types.ts";

const PAGE_SIZE = 10;

/** Photos shown before the rest collapse into a "+N" tile. */
const VISIBLE_MEDIA = 4;

type GroupPostsProps = {
  groupId: string;
  groupName: string;
  avatarUrl: string | null;
  locale: string;
};

const MediaGrid = ({ media }: { media: GroupPostMediaDTO[] }) => {
  const { t } = useTranslate();
  const items = [...media]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .flatMap((item) => {
      const url = safeExternalUrl(item.url);
      return url ? [{ ...item, url }] : [];
    });
  if (items.length === 0) return null;

  const shown = items.slice(0, VISIBLE_MEDIA);
  const hidden = items.length - shown.length;

  return (
    <div
      className={`grid gap-1 overflow-hidden rounded-2xl ${shown.length > 1 ? "grid-cols-2" : ""}`}
    >
      {shown.map((item, index) => {
        const isLast = index === shown.length - 1;
        const label = t("group_page.photo", {
          index: index + 1,
          total: items.length,
        });
        if (item.media_type === "VIDEO") {
          return (
            <video
              key={item.id}
              src={item.url}
              poster={safeExternalUrl(item.thumbnail_url) ?? undefined}
              controls
              preload="metadata"
              className="aspect-video h-full w-full bg-black object-cover"
            />
          );
        }
        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`relative block bg-slate-100 ${shown.length > 1 ? "aspect-square" : ""}`}
          >
            <img
              src={item.url}
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {isLast && hidden > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-2xl font-semibold text-white">
                +{hidden}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
};

const Post = ({
  post,
  groupName,
  avatarUrl,
  locale,
}: { post: GroupPostDTO } & Omit<GroupPostsProps, "groupId">) => {
  const { t } = useTranslate();
  const when = new Date(post.published_at || post.created_at);
  const links = (post.links ?? []).flatMap((link) => {
    const href = safeExternalUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });

  return (
    <article className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 sm:p-6">
      <header className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span className="size-10 rounded-full bg-slate-100" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#102544]">
            {post.creator_name?.trim() || groupName}
          </p>
          {!Number.isNaN(when.getTime()) && (
            <time
              dateTime={when.toISOString()}
              className="text-xs text-slate-500"
            >
              {when.toLocaleDateString(locale, { dateStyle: "medium" })}
            </time>
          )}
        </div>
      </header>

      {post.caption?.trim() && (
        <p className="whitespace-pre-line break-words text-[15px] leading-7 text-slate-800">
          {post.caption.trim()}
        </p>
      )}

      {post.media && post.media.length > 0 && <MediaGrid media={post.media} />}

      {links.length > 0 && (
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.id ?? link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-sm text-[#1b3a67] underline decoration-slate-300 underline-offset-4 hover:decoration-[#1b3a67]"
              >
                {link.title?.trim() || link.href}
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="flex items-center gap-5 text-sm text-slate-500">
        <span
          className="inline-flex items-center gap-1.5"
          aria-label={t("group_page.likes", { count: post.like_count ?? 0 })}
        >
          <FaRegHeart aria-hidden />
          {(post.like_count ?? 0).toLocaleString(locale)}
        </span>
        <span
          className="inline-flex items-center gap-1.5"
          aria-label={t("group_page.comments", {
            count: post.comment_count ?? 0,
          })}
        >
          <FaRegComment aria-hidden />
          {(post.comment_count ?? 0).toLocaleString(locale)}
        </span>
      </footer>
    </article>
  );
};

/** The group's published posts, newest first, a page at a time. */
const GroupPosts = ({
  groupId,
  groupName,
  avatarUrl,
  locale,
}: GroupPostsProps) => {
  const { t } = useTranslate();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    ["group-posts", groupId],
    ({ pageParam = 0 }) => fetchGroupPostsPage(groupId, pageParam, PAGE_SIZE),
    {
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage, pages) => {
        const fetched = pages.reduce((sum, page) => sum + page.posts.length, 0);
        return lastPage.posts.length > 0 && fetched < lastPage.total
          ? fetched
          : undefined;
      },
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (isError || posts.length === 0) {
    return (
      <p className="rounded-3xl bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        {t(isError ? "group_page.posts_failed" : "group_page.no_posts")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post
          key={post.id}
          post={post}
          groupName={groupName}
          avatarUrl={avatarUrl}
          locale={locale}
        />
      ))}
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-[#102544] transition hover:bg-slate-200 disabled:opacity-60"
          >
            {isFetchingNextPage
              ? t("group_page.loading")
              : t("group_page.show_more")}
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupPosts;
