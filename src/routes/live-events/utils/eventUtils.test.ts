import { describe, expect, it } from "vitest";
import type { EventDTO } from "../types.ts";
import {
  eventPhase,
  eventTitle,
  formatEventWindow,
  locationLabel,
  metadataForLanguage,
  preferredVideo,
  sortByPhaseThenTime,
  youtubeEmbedUrl,
  youtubeVideoId,
} from "./eventUtils.ts";

const event = (overrides: Partial<EventDTO> = {}): EventDTO => ({
  id: "event-1",
  group_id: "group-1",
  start_date: "2026-03-10T10:00:00+00:00",
  end_date: "2026-03-10T12:00:00+00:00",
  is_one_day: true,
  featured: true,
  metadata: { id: "m1", name: "Morning Puja", language: "en" },
  ...overrides,
});

describe("eventPhase", () => {
  it("is live between the start and the end", () => {
    const now = new Date("2026-03-10T11:00:00Z");
    expect(eventPhase(event(), now)).toBe("live");
  });

  it("is upcoming before the start and past after the end", () => {
    expect(eventPhase(event(), new Date("2026-03-10T09:59:00Z"))).toBe(
      "upcoming",
    );
    expect(eventPhase(event(), new Date("2026-03-10T12:01:00Z"))).toBe("past");
  });

  it("treats the boundaries as still live", () => {
    expect(eventPhase(event(), new Date("2026-03-10T10:00:00Z"))).toBe("live");
    expect(eventPhase(event(), new Date("2026-03-10T12:00:00Z"))).toBe("live");
  });

  it("compares instants, so a local offset does not shift the window", () => {
    // Same moment as 10:30 UTC, written in a +05:30 offset.
    const live = event({
      start_date: "2026-03-10T15:30:00+05:30",
      end_date: "2026-03-10T17:30:00+05:30",
    });
    expect(eventPhase(live, new Date("2026-03-10T11:00:00Z"))).toBe("live");
  });

  it("does not claim an unparseable date is live", () => {
    expect(eventPhase(event({ start_date: "not a date" }))).toBe("upcoming");
  });
});

describe("sortByPhaseThenTime", () => {
  it("puts live first, then soonest upcoming, then newest past", () => {
    const now = new Date("2026-03-10T11:00:00Z");
    const past = event({
      id: "past",
      start_date: "2026-03-01T10:00:00Z",
      end_date: "2026-03-01T12:00:00Z",
    });
    const olderPast = event({
      id: "older-past",
      start_date: "2026-02-01T10:00:00Z",
      end_date: "2026-02-01T12:00:00Z",
    });
    const soon = event({
      id: "soon",
      start_date: "2026-03-11T10:00:00Z",
      end_date: "2026-03-11T12:00:00Z",
    });
    const later = event({
      id: "later",
      start_date: "2026-04-11T10:00:00Z",
      end_date: "2026-04-11T12:00:00Z",
    });
    const live = event({ id: "live" });

    const sorted = sortByPhaseThenTime(
      [later, olderPast, live, past, soon],
      now,
    );

    expect(sorted.map((item) => item.id)).toEqual([
      "live",
      "soon",
      "later",
      "past",
      "older-past",
    ]);
  });

  it("leaves the caller's array untouched", () => {
    const input = [event({ id: "a" }), event({ id: "b" })];
    sortByPhaseThenTime(input);
    expect(input.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("metadataForLanguage", () => {
  const entries = [
    { id: "1", name: "Morning Puja", language: "en" },
    { id: "2", name: "ཞོགས་པའི་མཆོད་པ།", language: "bo" },
  ];

  it("picks the reader's language", () => {
    expect(metadataForLanguage(entries, "bo")?.id).toBe("2");
  });

  it("matches a region-tagged code against the base language", () => {
    expect(metadataForLanguage(entries, "bo-IN")?.id).toBe("2");
  });

  it("falls back to English, then to whatever exists", () => {
    expect(metadataForLanguage(entries, "zh")?.id).toBe("1");
    expect(metadataForLanguage([entries[1]], "zh")?.id).toBe("2");
  });

  it("handles a single entry and nothing at all", () => {
    expect(metadataForLanguage(entries[0], "en")?.id).toBe("1");
    expect(metadataForLanguage(null, "en")).toBeNull();
    expect(metadataForLanguage([], "en")).toBeNull();
  });
});

describe("eventTitle", () => {
  it("returns an empty string rather than 'undefined' when untitled", () => {
    expect(eventTitle(event({ metadata: null }), "en")).toBe("");
  });
});

describe("youtubeVideoId", () => {
  it("reads the id from every shape an organizer might paste", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      youtubeVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("returns null for anything that is not a YouTube video", () => {
    expect(youtubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeVideoId("https://zoom.us/j/123")).toBeNull();
    expect(youtubeVideoId("not a url")).toBeNull();
    expect(youtubeVideoId("")).toBeNull();
    // A watch link with no id at all.
    expect(youtubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });

  it("does not mistake a lookalike host for YouTube", () => {
    expect(
      youtubeVideoId("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
  });

  it("builds a nocookie embed url", () => {
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(youtubeEmbedUrl("https://vimeo.com/1")).toBeNull();
  });
});

describe("preferredVideo", () => {
  const videos = [
    {
      id: "v-en",
      url: "https://youtu.be/aaaaaaaaaaa",
      language: "en",
      display_order: 2,
    },
    {
      id: "v-bo",
      url: "https://youtu.be/bbbbbbbbbbb",
      language: "bo",
      display_order: 1,
    },
  ];

  it("prefers the reader's language over display order", () => {
    expect(preferredVideo(event({ youtube: videos }), "en")?.id).toBe("v-en");
    expect(preferredVideo(event({ youtube: videos }), "bo")?.id).toBe("v-bo");
  });

  it("falls back to English, then to display order", () => {
    expect(preferredVideo(event({ youtube: videos }), "zh")?.id).toBe("v-en");
    expect(preferredVideo(event({ youtube: [videos[1]] }), "zh")?.id).toBe(
      "v-bo",
    );
  });

  it("returns null when the event has no video", () => {
    expect(preferredVideo(event(), "en")).toBeNull();
    expect(preferredVideo(event({ youtube: [] }), "en")).toBeNull();
  });
});

describe("formatEventWindow", () => {
  it("gives one date and a time range for a same-day event", () => {
    const formatted = formatEventWindow(event(), "en-US");
    // Exact wording is the platform's; what matters is one date and two times.
    expect(formatted).toContain("–");
    expect(formatted.match(/\d{1,2}:\d{2}/g)?.length).toBe(2);
  });

  it("spells out both ends of a multi-day event", () => {
    const formatted = formatEventWindow(
      event({
        start_date: "2026-03-10T10:00:00Z",
        end_date: "2026-03-13T12:00:00Z",
      }),
      "en-US",
    );
    expect(formatted).toContain("Mar");
    expect(formatted).toContain("–");
  });

  it("returns an empty string for an unparseable start", () => {
    expect(formatEventWindow(event({ start_date: "nope" }), "en-US")).toBe("");
  });
});

describe("locationLabel", () => {
  it("joins the parts it has and skips the ones it does not", () => {
    expect(
      locationLabel(
        event({
          location: {
            id: "l1",
            name: "Main Hall",
            city: "Dharamshala",
            country: "India",
          },
        }),
      ),
    ).toBe("Main Hall, Dharamshala, India");
    expect(
      locationLabel(event({ location: { id: "l1", city: "Kathmandu" } })),
    ).toBe("Kathmandu");
    expect(locationLabel(event())).toBe("");
  });
});
