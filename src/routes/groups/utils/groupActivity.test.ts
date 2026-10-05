import { describe, expect, it } from "vitest";
import type { EventDTO } from "../../live-events/types.ts";
import type { GroupFeedItemDTO } from "../types.ts";
import { rankByActivity, summarizeGroupActivity } from "./groupActivity.ts";

const NOW = new Date("2026-10-05T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

const post = (groupId: string, publishedDaysAgo: number): GroupFeedItemDTO => ({
  type: "post",
  feed_at: daysAgo(publishedDaysAgo),
  group_id: groupId,
  post: {
    id: `${groupId}-${publishedDaysAgo}`,
    created_at: daysAgo(publishedDaysAgo),
    published_at: daysAgo(publishedDaysAgo),
  },
});

/** An event starting `startsInDays` from now and lasting an hour. */
const event = (groupId: string, startsInDays: number): GroupFeedItemDTO => {
  const start = new Date(NOW.getTime() + startsInDays * 86_400_000);
  return {
    type: "event",
    feed_at: start.toISOString(),
    group_id: groupId,
    event: {
      id: `${groupId}-event-${startsInDays}`,
      group_id: groupId,
      start_date: start.toISOString(),
      end_date: new Date(start.getTime() + 3_600_000).toISOString(),
      is_one_day: true,
      featured: false,
      metadata: null,
    } as EventDTO,
  };
};

describe("summarizeGroupActivity", () => {
  it("marks a group with an event under way as live", () => {
    const activity = summarizeGroupActivity([event("a", -0.01)], NOW);
    expect(activity.get("a")).toMatchObject({ level: "live", liveEvents: 1 });
  });

  it("counts a post this week or an event this week as active", () => {
    const activity = summarizeGroupActivity([post("a", 2), event("b", 3)], NOW);
    expect(activity.get("a")?.level).toBe("active");
    expect(activity.get("b")).toMatchObject({
      level: "active",
      upcomingEvents: 1,
    });
  });

  it("counts a post this month or a far-off event as recent", () => {
    const activity = summarizeGroupActivity(
      [post("a", 20), event("b", 40)],
      NOW,
    );
    expect(activity.get("a")?.level).toBe("recent");
    expect(activity.get("b")?.level).toBe("recent");
  });

  it("calls a group with only old posts and past events quiet", () => {
    const activity = summarizeGroupActivity(
      [post("a", 60), event("a", -10)],
      NOW,
    );
    expect(activity.get("a")?.level).toBe("quiet");
  });

  it("keeps the latest post whatever order the feed is in", () => {
    const activity = summarizeGroupActivity(
      [post("a", 9), post("a", 1), post("a", 4)],
      NOW,
    );
    expect(activity.get("a")?.lastPostAt).toBe(new Date(daysAgo(1)).getTime());
  });
});

describe("rankByActivity", () => {
  it("puts livelier groups first, then the latest poster, then the larger", () => {
    const groups = [
      { id: "quiet", member_count: 900 },
      { id: "older", member_count: 1 },
      { id: "big", member_count: 50 },
      { id: "small", member_count: 5 },
      { id: "live", member_count: 1 },
    ];
    const activity = summarizeGroupActivity(
      [post("older", 5), post("big", 1), post("small", 1), event("live", 0)],
      NOW,
    );
    expect(rankByActivity(groups, activity).map(({ id }) => id)).toEqual([
      "live",
      "big",
      "small",
      "older",
      "quiet",
    ]);
  });
});
