import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchEditionSegmentation: vi.fn(),
  fetchTextEditions: vi.fn(),
  fetchSegmentationSegments: vi.fn(),
  fetchEditionContent: vi.fn(),
  fetchTextById: vi.fn(),
  fetchSegmentContent: vi.fn(),
}));

vi.mock("./alignments.ts", () => ({
  resolveTranslationSegmentIds: vi.fn(),
}));

import {
  fetchEditionContent,
  fetchEditionSegmentation,
  fetchSegmentationSegments,
  fetchSegmentContent,
  fetchTextEditions,
  fetchTextById,
} from "./api.ts";
import { resolveTranslationSegmentIds } from "./alignments.ts";
import { getTextDetails, clearSegmentIndexCache } from "./textDetails.ts";

const EDITION = "edition-1";
const TEXT = "text-1";

/** The full edition text; the API only ever hands back slices of it. */
const FULL_CONTENT = "AAAABBBBCCCCDDDDEEEE";

const span = (id: string, start: number, end: number) => ({
  id,
  lines: [{ start, end }],
});

/** A segment whose text is split across several lines, like a verse. */
const multiLineSpan = (id: string, bounds: [number, number][]) => ({
  id,
  lines: bounds.map(([start, end]) => ({ start, end })),
});

const ALL_SPANS = [
  span("s1", 0, 4),
  span("s2", 4, 8),
  span("s3", 8, 12),
  span("s4", 12, 16),
  span("s5", 16, 20),
];

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  clearSegmentIndexCache();

  mocked(fetchEditionSegmentation).mockImplementation(async (id: string) =>
    id === EDITION ? { id: "seg-1", edition_id: EDITION, text_id: TEXT } : null,
  );
  // The library answers 200 with an empty list for an edition id, which is how
  // id resolution tells an edition id from a text id.
  mocked(fetchTextEditions).mockResolvedValue([]);
  mocked(fetchTextById).mockResolvedValue({
    id: TEXT,
    title: { en: "A Text" },
    language: "en",
    category_id: "cat-1",
    license: "public",
  });
  mocked(fetchSegmentationSegments).mockImplementation(
    async (_edition: string, limit: number, offset: number) => ({
      items: ALL_SPANS.slice(offset, offset + limit),
      has_more: offset + limit < ALL_SPANS.length,
      offset,
      limit,
    }),
  );
  // Mirrors the real endpoint: span_start/span_end slice the full content.
  mocked(fetchEditionContent).mockImplementation(
    async (_edition: string, start: number, end: number) =>
      FULL_CONTENT.slice(start, end),
  );
});

const contentsOf = (response: { content: { sections: any[] } }) =>
  response.content.sections[0].segments;

describe("getTextDetails windowing", () => {
  test("fetches only the requested window, not the whole edition", async () => {
    const result = await getTextDetails(EDITION, { size: 2 });

    expect(fetchSegmentationSegments).toHaveBeenCalledWith(EDITION, 2, 0);
    // The decisive assertion: content is requested for the window's span only.
    expect(fetchEditionContent).toHaveBeenCalledWith(EDITION, 0, 8);
    expect(contentsOf(result).map((s: any) => s.content)).toEqual([
      "AAAA",
      "BBBB",
    ]);
  });

  test("slices each segment out of the window at the right offset", async () => {
    const result = await getTextDetails(EDITION, {
      size: 2,
      segment_position: 3,
    });

    expect(fetchEditionContent).toHaveBeenCalledWith(EDITION, 8, 16);
    expect(contentsOf(result)).toEqual([
      {
        segment_id: "s3",
        segment_number: 3,
        content: "CCCC",
        type: null,
        reference: null,
        translation: null,
      },
      {
        segment_id: "s4",
        segment_number: 4,
        content: "DDDD",
        type: null,
        reference: null,
        translation: null,
      },
    ]);
  });

  test("a known position anchors the window without scanning for the segment", async () => {
    await getTextDetails(EDITION, { size: 2, segment_position: 3 });

    // One windowed call only - no full scan to locate the anchor.
    expect(fetchSegmentationSegments).toHaveBeenCalledTimes(1);
    expect(fetchSegmentationSegments).toHaveBeenCalledWith(EDITION, 2, 2);
  });

  test("an unknown segment id falls back to scanning, then anchors on it", async () => {
    const result = await getTextDetails(EDITION, {
      size: 2,
      segment_id: "s4",
    });

    expect(fetchSegmentationSegments).toHaveBeenCalledWith(EDITION, 500, 0);
    expect(contentsOf(result).map((s: any) => s.segment_id)).toEqual([
      "s4",
      "s5",
    ]);
    expect(result.current_segment_position).toBe(4);
  });

  test("a segment id that does not exist is a 404", async () => {
    await expect(
      getTextDetails(EDITION, { segment_id: "nope" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("paging backwards ends at the anchor and includes it", async () => {
    const result = await getTextDetails(EDITION, {
      size: 3,
      direction: "previous",
      segment_position: 4,
    });

    expect(contentsOf(result).map((s: any) => s.segment_id)).toEqual([
      "s2",
      "s3",
      "s4",
    ]);
    expect(result.pagination_direction).toBe("previous");
  });

  test("paging backwards near the start clamps to the first segment", async () => {
    const result = await getTextDetails(EDITION, {
      size: 10,
      direction: "previous",
      segment_position: 2,
    });

    expect(contentsOf(result).map((s: any) => s.segment_id)).toEqual([
      "s1",
      "s2",
    ]);
    expect(result.has_more_up).toBe(false);
  });

  test("an explicit start/end range wins over the anchor", async () => {
    const result = await getTextDetails(EDITION, { start: 2, end: 4 });

    expect(fetchSegmentationSegments).toHaveBeenCalledWith(EDITION, 3, 1);
    expect(result.current_segment_position).toBe(2);
  });

  test("reports more above and below from the window itself", async () => {
    const middle = await getTextDetails(EDITION, {
      size: 2,
      segment_position: 3,
    });
    expect(middle.has_more_up).toBe(true);
    expect(middle.has_more_down).toBe(true);

    const end = await getTextDetails(EDITION, { size: 2, segment_position: 4 });
    expect(end.has_more_down).toBe(false);
  });

  test("total_segments stays null until something has actually counted them", async () => {
    const windowed = await getTextDetails(EDITION, { size: 2 });
    expect(windowed.total_segments).toBeNull();

    // Anchoring by id scans the edition, so the count is known from then on.
    const scanned = await getTextDetails(EDITION, { segment_id: "s4" });
    expect(scanned.total_segments).toBe(5);
  });

  test("carries the edition's own type and reference for each segment", async () => {
    mocked(fetchSegmentationSegments).mockResolvedValue({
      items: [
        {
          id: "s1",
          lines: [{ start: 0, end: 4 }],
          type: "verse",
          reference: "2-57",
        },
        {
          id: "s2",
          lines: [{ start: 4, end: 8 }],
          type: "front_matter",
          reference: "I-1",
        },
      ],
      has_more: false,
      offset: 0,
      limit: 20,
    });

    const result = await getTextDetails(EDITION, { size: 2 });

    expect(contentsOf(result).map((s: any) => [s.type, s.reference])).toEqual([
      ["verse", "2-57"],
      ["front_matter", "I-1"],
    ]);
  });

  test("a segment's lines become line breaks in its content", async () => {
    // One segment covering 0-16 as four contiguous four-character lines.
    mocked(fetchSegmentationSegments).mockResolvedValue({
      items: [
        multiLineSpan("verse", [
          [0, 4],
          [4, 8],
          [8, 12],
          [12, 16],
        ]),
      ],
      has_more: false,
      offset: 0,
      limit: 20,
    });

    const result = await getTextDetails(EDITION, { size: 1 });

    expect(contentsOf(result)[0].content).toBe("AAAA\nBBBB\nCCCC\nDDDD");
  });

  test("a single-line segment gains no stray break", async () => {
    const result = await getTextDetails(EDITION, { size: 1 });

    expect(contentsOf(result)[0].content).toBe("AAAA");
    expect(contentsOf(result)[0].content).not.toContain("\n");
  });

  test("a segment with no lines is empty rather than a break", async () => {
    mocked(fetchSegmentationSegments).mockResolvedValue({
      items: [{ id: "blank", lines: [] }, span("s2", 4, 8)],
      has_more: false,
      offset: 0,
      limit: 20,
    });

    const result = await getTextDetails(EDITION, { size: 2 });

    expect(contentsOf(result)[0].content).toBe("");
  });

  test("an empty edition returns no segments rather than failing", async () => {
    mocked(fetchSegmentationSegments).mockResolvedValue({
      items: [],
      has_more: false,
      offset: 0,
      limit: 20,
    });

    const result = await getTextDetails(EDITION);

    expect(contentsOf(result)).toEqual([]);
    expect(result.total_segments).toBe(0);
    expect(fetchEditionContent).not.toHaveBeenCalled();
  });
});

describe("getTextDetails translations", () => {
  const VERSION = "edition-2";
  const VERSION_CONTENT = "onetwothreefour!!!!!";
  const VERSION_SPANS = [
    multiLineSpan("v1", [
      [0, 3],
      [3, 6],
    ]),
    multiLineSpan("v2", [
      [6, 11],
      [11, 15],
    ]),
  ];

  beforeEach(() => {
    mocked(fetchEditionSegmentation).mockImplementation(async (id: string) => {
      if (id === EDITION)
        return { id: "seg-1", edition_id: EDITION, text_id: TEXT };
      if (id === VERSION)
        return { id: "seg-2", edition_id: VERSION, text_id: "text-2" };
      return null;
    });
    mocked(fetchSegmentationSegments).mockImplementation(
      async (edition: string, limit: number, offset: number) => {
        const source = edition === VERSION ? VERSION_SPANS : ALL_SPANS;
        return {
          items: source.slice(offset, offset + limit),
          has_more: offset + limit < source.length,
          offset,
          limit,
        };
      },
    );
    mocked(fetchEditionContent).mockImplementation(
      async (edition: string, start: number, end: number) =>
        (edition === VERSION ? VERSION_CONTENT : FULL_CONTENT).slice(
          start,
          end,
        ),
    );
  });

  test("a translation keeps the line breaks of its own segment", async () => {
    mocked(resolveTranslationSegmentIds).mockResolvedValue(
      new Map([["s1", ["v1"]]]),
    );

    const result = await getTextDetails(EDITION, {
      size: 1,
      version_id: VERSION,
    });

    expect(contentsOf(result)[0].translation).toEqual({
      text_id: VERSION,
      language: "en",
      content: "one\ntwo",
    });
    // Sliced out of one content request, not fetched segment by segment.
    expect(fetchSegmentContent).not.toHaveBeenCalled();
  });

  test("several aligned segments render on separate lines", async () => {
    mocked(resolveTranslationSegmentIds).mockResolvedValue(
      new Map([["s1", ["v1", "v2"]]]),
    );

    const result = await getTextDetails(EDITION, {
      size: 1,
      version_id: VERSION,
    });

    expect(contentsOf(result)[0].translation?.content).toBe(
      "one\ntwo\nthree\nfour",
    );
  });

  test("falls back to per-segment content for an unlisted segment", async () => {
    mocked(resolveTranslationSegmentIds).mockResolvedValue(
      new Map([["s1", ["stray"]]]),
    );
    mocked(fetchSegmentContent).mockResolvedValue("elsewhere");

    const result = await getTextDetails(EDITION, {
      size: 1,
      version_id: VERSION,
    });

    expect(fetchSegmentContent).toHaveBeenCalledWith("stray");
    expect(contentsOf(result)[0].translation?.content).toBe("elsewhere");
  });

  test("no alignment leaves the segment untranslated", async () => {
    mocked(resolveTranslationSegmentIds).mockResolvedValue(new Map());

    const result = await getTextDetails(EDITION, {
      size: 1,
      version_id: VERSION,
    });

    expect(contentsOf(result)[0].translation).toBeNull();
  });
});

describe("getTextDetails id resolution", () => {
  test("an edition id resolves without a failing request", async () => {
    await getTextDetails(EDITION, { size: 1 });

    // The text endpoint answers [] for an edition id, so the id is read as one
    // and the single segmentation lookup settles it. Nothing 404s on the way.
    expect(fetchTextEditions).toHaveBeenCalledWith(EDITION);
    expect(fetchEditionSegmentation).toHaveBeenCalledTimes(1);
    expect(fetchEditionSegmentation).toHaveBeenCalledWith(EDITION);
  });

  test("a text id never probes the segmentation endpoint with it", async () => {
    mocked(fetchTextEditions).mockResolvedValue([
      { id: EDITION, text_id: TEXT },
    ]);

    await getTextDetails(TEXT, { size: 1 });

    // Asking /editions/{textId}/segmentation is a guaranteed 404, and the
    // reader only ever holds text ids, so it used to happen on every load.
    expect(fetchEditionSegmentation).not.toHaveBeenCalledWith(TEXT);
    expect(fetchEditionSegmentation).toHaveBeenCalledWith(EDITION);
  });

  test("a text id resolves through its first critical edition", async () => {
    mocked(fetchTextEditions).mockResolvedValue([
      { id: EDITION, text_id: TEXT },
    ]);

    const result = await getTextDetails(TEXT, { size: 1 });

    expect(fetchTextEditions).toHaveBeenCalledWith(TEXT);
    expect(result.content.id).toBe(EDITION);
  });

  test("a text with no edition is a 404", async () => {
    mocked(fetchTextEditions).mockResolvedValue([]);

    await expect(getTextDetails("unknown")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getTextDetails metadata", () => {
  test("maps the text into the detail shape the reader renders", async () => {
    const result = await getTextDetails(EDITION, { size: 1 });

    expect(result.text_detail).toMatchObject({
      id: TEXT,
      title: "A Text",
      language: "en",
      group_id: "cat-1",
      type: "root_text",
      license: "public",
    });
  });
});
