import { eventPhase } from "../../live-events/utils/eventUtils.ts";
import type { GroupFeedItemDTO } from "../types.ts";

/**
 * How lively a group is, from what it has posted and scheduled lately:
 * gathering right now, active this week, active this month, or quiet.
 */
export type ActivityLevel = "live" | "active" | "recent" | "quiet";

export type GroupActivity = {
  level: ActivityLevel;
  /** When the group last posted, as an instant; null if not in the feed. */
  lastPostAt: number | null;
  liveEvents: number;
  upcomingEvents: number;
};

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW = 7 * DAY;
const RECENT_WINDOW = 30 * DAY;

const LEVEL_ORDER: Record<ActivityLevel, number> = {
  live: 0,
  active: 1,
  recent: 2,
  quiet: 3,
};

export const QUIET: GroupActivity = {
  level: "quiet",
  lastPostAt: null,
  liveEvents: 0,
  upcomingEvents: 0,
};

const instant = (value: string | null | undefined): number | null => {
  const at = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(at) ? null : at;
};

/**
 * Each group's activity, read off the cross-group feed. A group missing from
 * the feed has done nothing recent enough to make it, and is quiet.
 */
export const summarizeGroupActivity = (
  items: GroupFeedItemDTO[],
  now: Date = new Date(),
): Map<string, GroupActivity> => {
  const at = now.getTime();
  const tallies = new Map<
    string,
    Omit<GroupActivity, "level"> & { nextEventAt: number | null }
  >();

  for (const item of items) {
    const tally = tallies.get(item.group_id) ?? {
      lastPostAt: null,
      liveEvents: 0,
      upcomingEvents: 0,
      nextEventAt: null,
    };
    tallies.set(item.group_id, tally);

    if (item.type === "post" && item.post) {
      const posted = instant(item.post.published_at ?? item.post.created_at);
      if (posted !== null && posted > (tally.lastPostAt ?? -Infinity))
        tally.lastPostAt = posted;
    } else if (item.type === "event" && item.event) {
      const phase = eventPhase(item.event, now);
      if (phase === "live") tally.liveEvents += 1;
      if (phase === "upcoming") {
        tally.upcomingEvents += 1;
        const starts = instant(item.event.start_date);
        if (starts !== null && starts < (tally.nextEventAt ?? Infinity))
          tally.nextEventAt = starts;
      }
    }
  }

  const summary = new Map<string, GroupActivity>();
  for (const [groupId, { nextEventAt, ...tally }] of tallies) {
    const postedWithin = (window: number) =>
      tally.lastPostAt !== null && at - tally.lastPostAt <= window;
    const level: ActivityLevel =
      tally.liveEvents > 0
        ? "live"
        : postedWithin(ACTIVE_WINDOW) ||
            (nextEventAt !== null && nextEventAt - at <= ACTIVE_WINDOW)
          ? "active"
          : postedWithin(RECENT_WINDOW) || tally.upcomingEvents > 0
            ? "recent"
            : "quiet";
    summary.set(groupId, { ...tally, level });
  }
  return summary;
};

/**
 * Livelier groups first; among equals, the one that posted most recently,
 * then the larger one.
 */
export const rankByActivity = <
  T extends { id: string; member_count?: number | null },
>(
  groups: T[],
  activity: Map<string, GroupActivity>,
): T[] =>
  [...groups].sort((a, b) => {
    const left = activity.get(a.id) ?? QUIET;
    const right = activity.get(b.id) ?? QUIET;
    return (
      LEVEL_ORDER[left.level] - LEVEL_ORDER[right.level] ||
      (right.lastPostAt ?? 0) - (left.lastPostAt ?? 0) ||
      (b.member_count ?? 0) - (a.member_count ?? 0)
    );
  });

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 days ago" in the reader's language, or English where it has none. */
export const formatTimeAgo = (
  at: number,
  locale: string,
  now: Date = new Date(),
): string => {
  const seconds = Math.round((at - now.getTime()) / 1000);
  let format: Intl.RelativeTimeFormat;
  try {
    format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  } catch {
    format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  for (const [unit, size] of TIME_UNITS) {
    if (Math.abs(seconds) >= size)
      return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "minute");
};
