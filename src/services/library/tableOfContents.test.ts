import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./client.ts", () => ({
  libraryGet: vi.fn(),
  libraryGetOrNull: vi.fn(),
}));
vi.mock("./api.ts", () => ({ fetchTextById: vi.fn() }));
vi.mock("./textDetails.ts", () => ({
  getAllSegmentSpans: vi.fn(),
  resolveEditionContext: vi.fn(),
}));

import { libraryGet } from "./client.ts";
import { fetchTextById } from "./api.ts";
import { getAllSegmentSpans, resolveEditionContext } from "./textDetails.ts";
import { getTableOfContents } from "./tableOfContents.ts";

const mockedGet = libraryGet as ReturnType<typeof vi.fn>;
const mockedText = fetchTextById as ReturnType<typeof vi.fn>;
const mockedSpans = getAllSegmentSpans as ReturnType<typeof vi.fn>;
const mockedContext = resolveEditionContext as ReturnType<typeof vi.fn>;

/** Three segments, each one character wide, at 0, 10 and 20. */
const spans = [
  { id: "s1", lines: [{ start: 0, end: 5 }] },
  { id: "s2", lines: [{ start: 10, end: 15 }] },
  { id: "s3", lines: [{ start: 20, end: 25 }] },
];

const tocWithSpan = (span: { start: number; end: number }) => [
  {
    id: "toc-1",
    edition_id: "ed-1",
    text_id: "text-1",
    sections: [
      { id: "sec-1", title: { en: "Chapter" }, span, subsections: [] },
    ],
  },
];

describe("getTableOfContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedContext.mockResolvedValue({
      editionId: "ed-1",
      textId: "text-1",
      segmentationId: "seg-1",
    });
    mockedText.mockResolvedValue({
      id: "text-1",
      language: "en",
      title: { en: "A Text" },
    });
    mockedSpans.mockResolvedValue(spans);
  });

  test("reads the annotation from the edition's table-of-contents endpoint", async () => {
    mockedGet.mockResolvedValue(tocWithSpan({ start: 0, end: 30 }));

    await getTableOfContents("text-1");

    expect(mockedGet).toHaveBeenCalledWith(
      "/v2/editions/ed-1/table-of-contents",
      undefined,
      "table of contents",
    );
  });

  test("anchors a section to the first segment starting inside its span", async () => {
    mockedGet.mockResolvedValue(tocWithSpan({ start: 8, end: 30 }));

    const toc = await getTableOfContents("text-1");

    expect(toc.contents[0].sections[0].segments).toEqual([
      { segment_id: "s2" },
    ]);
  });

  test("anchors an empty span - a heading with no text of its own - to the segment that follows it", async () => {
    mockedGet.mockResolvedValue(tocWithSpan({ start: 16, end: 16 }));

    const toc = await getTableOfContents("text-1");

    expect(toc.contents[0].sections[0].segments).toEqual([
      { segment_id: "s3" },
    ]);
  });

  test("leaves a section unanchored when no segment follows it", async () => {
    mockedGet.mockResolvedValue(tocWithSpan({ start: 999, end: 999 }));

    const toc = await getTableOfContents("text-1");

    expect(toc.contents[0].sections[0].segments).toEqual([]);
  });

  test("returns no contents when the edition carries no annotation", async () => {
    mockedGet.mockRejectedValue(new Error("nope"));

    const toc = await getTableOfContents("text-1");

    expect(toc.contents).toEqual([]);
    expect(toc.text_detail).toEqual({
      id: "text-1",
      language: "en",
      title: "A Text",
    });
  });
});
