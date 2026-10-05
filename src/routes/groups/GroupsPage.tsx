import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import { cn } from "@/lib/utils";
import SectionHeading from "../../components/SectionHeading.tsx";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { mapLanguageCode } from "../../utils/helperFunctions.tsx";
import { tolgeeToPlanLanguage } from "../planviewer/utils/seriesUtils.ts";
import { fetchPublicGroups } from "../mantras/api/accumulatorApi.ts";
import {
  getGroupDescriptionForLanguage,
  getGroupTitleForLanguage,
  getMemberInitials,
} from "../mantras/utils/groupUtils.ts";
import type { AuthorGroupSummaryDTO } from "../mantras/types.ts";
import { fetchGroupActivityFeed } from "./api/groupsApi.ts";
import { groupAddress } from "./utils/groupHandle.ts";
import {
  formatTimeAgo,
  QUIET,
  rankByActivity,
  summarizeGroupActivity,
  type ActivityLevel,
  type GroupActivity,
} from "./utils/groupActivity.ts";

/** Often enough to notice a gathering starting; the feed is one request. */
const REFRESH_MS = 60_000;

/** Group names come in any script; Tibetan ones need the Tibetan face. */
const TIBETAN = /[ༀ-࿿]/;

const LEVELS: ActivityLevel[] = ["live", "active", "recent", "quiet"];

const DOT_CLASS: Record<ActivityLevel, string> = {
  live: "bg-red-500",
  active: "bg-emerald-500",
  recent: "bg-amber-400",
  quiet: "bg-stone-300",
};

const CardSkeleton = () => (
  <div className="flex gap-4 rounded-3xl bg-white p-5 ring-1 ring-slate-900/5">
    <div className="size-14 shrink-0 animate-pulse rounded-full bg-slate-100" />
    <div className="flex-1 space-y-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
    </div>
  </div>
);

/**
 * Every practice group, at `/groups`, sorted by how active it is: those
 * gathering right now first, then those that posted or meet this week, this
 * month, and the quiet ones last. Each card says why it sits where it does
 * and opens the group's own page, with its posts, events and plans.
 */
const GroupsPage = () => {
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const storedLanguage =
    tolgee.getLanguage() || localStorage.getItem(LANGUAGE) || "en";
  const apiLanguage = mapLanguageCode(storedLanguage);
  const planLanguage = tolgeeToPlanLanguage(storedLanguage);

  const {
    data: groupsData,
    isLoading,
    error,
  } = useQuery(
    ["public-groups-all", apiLanguage],
    () => fetchPublicGroups(apiLanguage, 100),
    { refetchOnWindowFocus: false },
  );
  // Activity only orders and annotates the list; without it the groups
  // still show, all of them under Quiet.
  const { data: feedData } = useQuery(
    ["group-activity-feed", apiLanguage],
    () => fetchGroupActivityFeed(apiLanguage),
    { refetchInterval: REFRESH_MS, retry: false },
  );

  const activity = useMemo(
    () => summarizeGroupActivity(feedData?.items ?? []),
    [feedData],
  );
  const bands = useMemo(() => {
    const ranked = rankByActivity(groupsData?.groups ?? [], activity);
    return LEVELS.map((level) => ({
      level,
      groups: ranked.filter(
        (group) => (activity.get(group.id) ?? QUIET).level === level,
      ),
    })).filter((band) => band.groups.length > 0);
  }, [groupsData, activity]);

  const bandHeading: Record<ActivityLevel, string> = {
    live: t("groups_page.band_live", "Gathering now"),
    active: t("groups_page.band_active", "Active this week"),
    recent: t("groups_page.band_recent", "Active this month"),
    quiet: t("groups_page.band_quiet", "Quiet lately"),
  };

  const statusLine = ({
    level,
    lastPostAt,
    liveEvents,
    upcomingEvents,
  }: GroupActivity): string => {
    const parts: string[] = [];
    if (liveEvents > 0) parts.push(t("groups_page.live", "Live now"));
    if (lastPostAt !== null && level !== "quiet")
      parts.push(
        t("groups_page.posted", "Posted {time}", {
          time: formatTimeAgo(lastPostAt, storedLanguage),
        }),
      );
    if (upcomingEvents > 0)
      parts.push(
        t("groups_page.upcoming", "{count} upcoming events", {
          count: upcomingEvents,
        }),
      );
    return parts.length
      ? parts.join(" · ")
      : t("groups_page.no_recent_activity", "No recent activity");
  };

  const renderCard = (group: AuthorGroupSummaryDTO) => {
    const title = getGroupTitleForLanguage(
      group.metadata,
      planLanguage,
      t("group_page.untitled"),
    );
    const description = getGroupDescriptionForLanguage(
      group.metadata,
      planLanguage,
    );
    const groupActivity = activity.get(group.id) ?? QUIET;
    const members = group.joiner_count ?? group.member_count ?? 0;
    return (
      <Link
        key={group.id}
        to={groupAddress(group)}
        className="group flex gap-4 rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 transition hover:shadow-md"
      >
        <span className="relative size-14 shrink-0">
          {group.avatar_url ? (
            <img
              src={group.avatar_url}
              alt=""
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full bg-rose-100 text-lg font-semibold text-rose-700">
              {getMemberInitials(title)}
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              "absolute right-0 bottom-0 size-3.5 rounded-full ring-2 ring-white",
              DOT_CLASS[groupActivity.level],
              groupActivity.level === "live" && "animate-pulse",
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "line-clamp-2 font-semibold text-[#102544] group-hover:underline",
              TIBETAN.test(title) && "bo-text",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-1 text-sm",
              groupActivity.level === "live"
                ? "font-medium text-red-600"
                : "text-slate-600",
            )}
          >
            {statusLine(groupActivity)}
          </p>
          {description && (
            <p
              className={cn(
                "mt-2 line-clamp-2 text-sm text-slate-500",
                TIBETAN.test(description) && "bo-text",
              )}
            >
              {description}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            {t("group_page.members_count", {
              count: members.toLocaleString(storedLanguage),
            })}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Seo
        title={`${t("groups_page.title", "Practice groups")} | ${siteName}`}
        description={t(
          "groups_page.subtitle",
          "Communities practising together. See who is gathering now, what they have posted, and the events and plans they share.",
        )}
        canonical=""
      />
      <SectionHeading
        eyebrow={t("home.practice_spaces", "Practice spaces")}
        title={t("groups_page.title", "Practice groups")}
        description={t(
          "groups_page.subtitle",
          "Communities practising together. See who is gathering now, what they have posted, and the events and plans they share.",
        )}
      />

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      )}

      {!isLoading && Boolean(error) && (
        <p className="rounded-3xl bg-rose-50 px-6 py-8 text-center text-sm text-rose-800">
          {t(
            "groups_page.load_failed",
            "We could not load the practice groups just now. Please try again.",
          )}
        </p>
      )}

      {!isLoading && !error && bands.length === 0 && (
        <p className="rounded-3xl bg-slate-50 px-6 py-16 text-center text-sm text-slate-600">
          {t("groups_page.empty", "There are no practice groups yet.")}
        </p>
      )}

      {!isLoading &&
        !error &&
        bands.map((band) => (
          <section
            key={band.level}
            aria-labelledby={`groups-${band.level}`}
            className="mt-12 first:mt-8"
          >
            <h2
              id={`groups-${band.level}`}
              className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
            >
              <span
                aria-hidden
                className={cn("size-2 rounded-full", DOT_CLASS[band.level])}
              />
              {bandHeading[band.level]}
              <span className="font-normal text-slate-400">
                {band.groups.length}
              </span>
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {band.groups.map(renderCard)}
            </div>
          </section>
        ))}
    </div>
  );
};

export default GroupsPage;
