import { describe, test, expect } from "vitest";
import {
  firstSegmentIdInSection,
  groupSegmentsByHeading,
  hasTableOfContents,
  tableOfContentsQueryKey,
  tocHeadingsBySegment,
} from "./useTableOfContents.ts";
import type { TocSection } from "@/services/library";

const section = (override: Partial<TocSection> = {}): TocSection => ({
  id: "section-1",
  title: "Section",
  sections: [],
  segments: [],
  ...override,
});

describe("tableOfContentsQueryKey", () => {
  test("is stable for the same text, so header and panel share one fetch", () => {
    expect(tableOfContentsQueryKey("text-1")).toEqual(
      tableOfContentsQueryKey("text-1"),
    );
    expect(tableOfContentsQueryKey("text-1")).not.toEqual(
      tableOfContentsQueryKey("text-2"),
    );
  });
});

describe("hasTableOfContents", () => {
  test("is false while the annotation is still loading", () => {
    expect(hasTableOfContents(undefined)).toBe(false);
  });

  test("is false for an edition with no table-of-contents annotation", () => {
    expect(hasTableOfContents({ contents: [], text_detail: null })).toBe(false);
  });

  test("is false when the annotation carries no sections", () => {
    expect(
      hasTableOfContents({
        contents: [{ id: "toc-1", sections: [] }],
        text_detail: null,
      }),
    ).toBe(false);
  });

  test("is true once there is a section to draw", () => {
    expect(
      hasTableOfContents({
        contents: [{ id: "toc-1", sections: [section()] }],
        text_detail: null,
      }),
    ).toBe(true);
  });
});

describe("firstSegmentIdInSection", () => {
  test("prefers the section's own resolved segment", () => {
    const parent = section({
      segments: [{ segment_id: "own" }],
      sections: [section({ id: "child", segments: [{ segment_id: "child" }] })],
    });
    expect(firstSegmentIdInSection(parent)).toBe("own");
  });

  test("falls back to the first descendant that resolved", () => {
    const parent = section({
      sections: [
        section({ id: "a" }),
        section({
          id: "b",
          sections: [section({ id: "b1", segments: [{ segment_id: "deep" }] })],
        }),
      ],
    });
    expect(firstSegmentIdInSection(parent)).toBe("deep");
  });

  test("is undefined when nothing in the subtree resolved to a segment", () => {
    expect(
      firstSegmentIdInSection(section({ sections: [section({ id: "a" })] })),
    ).toBeUndefined();
  });
});

const toc = (sections: TocSection[]) => ({
  contents: [{ id: "toc-1", sections }],
  text_detail: null,
});

describe("tocHeadingsBySegment", () => {
  test("keys each title by the segment its section begins at", () => {
    const headings = tocHeadingsBySegment(
      toc([
        section({
          id: "one",
          title: "Chapter One",
          segments: [{ segment_id: "s1" }],
        }),
        section({
          id: "two",
          title: "Chapter Two",
          segments: [{ segment_id: "s7" }],
        }),
      ]),
    );
    expect(headings.get("s1")).toEqual([
      { id: "one", title: "Chapter One", depth: 0 },
    ]);
    expect(headings.get("s7")).toEqual([
      { id: "two", title: "Chapter Two", depth: 0 },
    ]);
    expect(headings.get("s4")).toBeUndefined();
  });

  test("stacks sections that begin at the same segment, outermost first", () => {
    const headings = tocHeadingsBySegment(
      toc([
        section({
          id: "chapter",
          title: "Chapter",
          segments: [{ segment_id: "s1" }],
          sections: [
            section({
              id: "part",
              title: "Part",
              segments: [{ segment_id: "s1" }],
              sections: [
                section({
                  id: "sub",
                  title: "Subsection",
                  segments: [{ segment_id: "s1" }],
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    expect(headings.get("s1")).toEqual([
      { id: "chapter", title: "Chapter", depth: 0 },
      { id: "part", title: "Part", depth: 1 },
      { id: "sub", title: "Subsection", depth: 2 },
    ]);
  });

  test("places a section that resolved only through a descendant", () => {
    const headings = tocHeadingsBySegment(
      toc([
        section({
          id: "parent",
          title: "Parent",
          sections: [
            section({
              id: "child",
              title: "Child",
              segments: [{ segment_id: "s3" }],
            }),
          ],
        }),
      ]),
    );
    expect(headings.get("s3")).toEqual([
      { id: "parent", title: "Parent", depth: 0 },
      { id: "child", title: "Child", depth: 1 },
    ]);
  });

  test("is empty when there is no annotation", () => {
    expect(tocHeadingsBySegment(undefined).size).toBe(0);
  });
});

describe("groupSegmentsByHeading", () => {
  const segments = [
    { segment_id: "s1" },
    { segment_id: "s2" },
    { segment_id: "s3" },
    { segment_id: "s4" },
  ];

  test("keeps the reader's text in one run when there is nothing to place", () => {
    const groups = groupSegmentsByHeading(segments, new Map());
    expect(groups).toHaveLength(1);
    expect(groups[0].headings).toEqual([]);
    expect(groups[0].segments).toEqual(segments);
  });

  test("breaks a new run where a section begins", () => {
    const heading = { id: "two", title: "Chapter Two", depth: 0 };
    const groups = groupSegmentsByHeading(
      segments,
      new Map([["s3", [heading]]]),
    );
    expect(
      groups.map((group) => group.segments.map((s) => s.segment_id)),
    ).toEqual([
      ["s1", "s2"],
      ["s3", "s4"],
    ]);
    expect(groups[0].headings).toEqual([]);
    expect(groups[1].headings).toEqual([heading]);
  });

  test("carries a heading on the very first segment without an empty run", () => {
    const heading = { id: "one", title: "Chapter One", depth: 0 };
    const groups = groupSegmentsByHeading(
      segments,
      new Map([["s1", [heading]]]),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].headings).toEqual([heading]);
  });

  test("handles a section that is a single segment long", () => {
    const groups = groupSegmentsByHeading(
      segments,
      new Map([
        ["s2", [{ id: "a", title: "A", depth: 0 }]],
        ["s3", [{ id: "b", title: "B", depth: 0 }]],
      ]),
    );
    expect(
      groups.map((group) => group.segments.map((s) => s.segment_id)),
    ).toEqual([["s1"], ["s2"], ["s3", "s4"]]);
  });

  test("tolerates a section with no segments at all", () => {
    expect(groupSegmentsByHeading(undefined, new Map())).toEqual([]);
  });
});
