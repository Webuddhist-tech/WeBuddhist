import { describe, expect, it } from "vitest";
import { daysEndingOn, splitVerseSource, toIsoDate } from "./verseOfDay.ts";

describe("splitVerseSource", () => {
  it("separates the source after the last tilde", () => {
    expect(
      splitVerseSource("Know all compounded phenomena.\n   \n  ~Vajracchedikā"),
    ).toEqual({
      body: "Know all compounded phenomena.",
      source: "Vajracchedikā",
    });
  });

  it("keeps the whole text when there is no source", () => {
    expect(splitVerseSource("  Just a verse.  ")).toEqual({
      body: "Just a verse.",
      source: "",
    });
  });
});

describe("daysEndingOn", () => {
  it("counts back across a month boundary, newest first", () => {
    expect(daysEndingOn("2026-10-02", 4)).toEqual([
      "2026-10-02",
      "2026-10-01",
      "2026-09-30",
      "2026-09-29",
    ]);
  });
});

describe("toIsoDate", () => {
  it("zero-pads month and day", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
