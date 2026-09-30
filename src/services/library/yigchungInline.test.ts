import { describe, expect, test } from "vitest";
import {
  buildSegmentContentWithYigchung,
  partitionRangeWithYigchung,
} from "./yigchungInline.ts";

describe("partitionRangeWithYigchung", () => {
  test("splits a line around a yigchung mark", () => {
    const parts = partitionRangeWithYigchung(0, 10, [
      { span: { start: 3, end: 7 }, index: 0 },
    ]);
    expect(parts).toEqual([
      { start: 0, end: 3, yigchungIndex: undefined },
      { start: 3, end: 7, yigchungIndex: 0 },
      { start: 7, end: 10, yigchungIndex: undefined },
    ]);
  });
});

describe("buildSegmentContentWithYigchung", () => {
  test("wraps yigchung spans in footnote markup", () => {
    const window = "ABCDEFGH";
    const html = buildSegmentContentWithYigchung(
      [{ start: 0, end: 8 }],
      "ABCDEFGH",
      [{ span: { start: 2, end: 5 }, index: 4 }],
      window,
      0,
    );
    expect(html).toContain("AB");
    expect(html).toContain('class="footnote-marker">5</span>');
    expect(html).toContain('class="footnote yigchung-inline">CDE</span>');
    expect(html).toContain("FGH");
  });

  test("preserves line breaks between segment lines", () => {
    const window = "AAAABBBB";
    const html = buildSegmentContentWithYigchung(
      [
        { start: 0, end: 4 },
        { start: 4, end: 8 },
      ],
      "AAAA\nBBBB",
      [{ span: { start: 4, end: 8 }, index: 0 }],
      window,
      0,
    );
    expect(html).toContain("AAAA\n");
    expect(html).toContain('yigchung-inline">BBBB</span>');
  });

  test("does not double-wrap when footnotes already exist", () => {
    const existing = '<span class="footnote">note</span>';
    expect(
      buildSegmentContentWithYigchung(
        [{ start: 0, end: 4 }],
        existing,
        [{ span: { start: 0, end: 4 }, index: 0 }],
        "text",
        0,
      ),
    ).toBe(existing);
  });
});
