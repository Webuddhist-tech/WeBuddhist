import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./client.ts", () => ({
  libraryGet: vi.fn(),
}));
vi.mock("./api.ts", () => ({
  fetchTextById: vi.fn(),
  fetchEditionContent: vi.fn(),
}));
vi.mock("./textDetails.ts", () => ({
  getAllSegmentSpans: vi.fn(),
  resolveEditionContext: vi.fn(),
}));

import { libraryGet } from "./client.ts";
import { fetchTextById, fetchEditionContent } from "./api.ts";
import { getAllSegmentSpans, resolveEditionContext } from "./textDetails.ts";
import { clearYigchungMarksCache } from "./yigchungMarks.ts";
import { getYigchungMarkSpans } from "./yigchungMarks.ts";
import { getYigchungs } from "./yigchungs.ts";
import { YIGCHUNG_FIXTURE_TEXT_ID } from "./yigchungs.fixture.ts";

const mockedGet = libraryGet as ReturnType<typeof vi.fn>;
const mockedText = fetchTextById as ReturnType<typeof vi.fn>;
const mockedContent = fetchEditionContent as ReturnType<typeof vi.fn>;
const mockedSpans = getAllSegmentSpans as ReturnType<typeof vi.fn>;
const mockedContext = resolveEditionContext as ReturnType<typeof vi.fn>;

describe("getYigchungs", () => {
  beforeEach(() => {
    clearYigchungMarksCache();
    vi.clearAllMocks();
    mockedContext.mockResolvedValue({
      editionId: "ed-1",
      textId: "text-1",
      segmentationId: "seg-1",
    });
    mockedText.mockResolvedValue({
      id: "text-1",
      language: "bo",
      title: { bo: "Test" },
    });
    mockedSpans.mockResolvedValue([
      { id: "s1", lines: [{ start: 0, end: 50 }] },
    ]);
  });

  test("reads yigchung marks from the edition endpoint", async () => {
    mockedGet.mockResolvedValue([]);
    await getYigchungs("text-1");
    expect(mockedGet).toHaveBeenCalledWith(
      "/v2/editions/ed-1/yigchungs",
      undefined,
      "yigchungs",
    );
  });

  test("reuses one cached edition fetch for inline spans and panel list", async () => {
    mockedGet.mockResolvedValue([]);
    await getYigchungMarkSpans("ed-1");
    await getYigchungs("text-1");
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  test("returns empty items when the edition has no yigchung marks", async () => {
    mockedGet.mockResolvedValue([]);
    const result = await getYigchungs("text-1");
    expect(result.items).toEqual([]);
    expect(mockedContent).not.toHaveBeenCalled();
    expect(mockedSpans).not.toHaveBeenCalled();
  });

  test("documents a library text id that has yigchung marks for manual QA", () => {
    expect(YIGCHUNG_FIXTURE_TEXT_ID).toMatch(/^[A-Za-z0-9]+$/);
  });

  test("slices edition content for each mark span", async () => {
    mockedGet.mockResolvedValue([
      {
        id: "y1",
        edition_id: "ed-1",
        text_id: "text-1",
        span: { start: 10, end: 15 },
        metadata: { name: "a" },
      },
      {
        id: "y2",
        edition_id: "ed-1",
        text_id: "text-1",
        span: { start: 20, end: 23 },
      },
    ]);
    mockedContent.mockImplementation(
      (_editionId: string, start: number, end: number) => {
        if (start === 10 && end === 15) return Promise.resolve("56789");
        if (start === 20 && end === 23) return Promise.resolve("012");
        return Promise.resolve("");
      },
    );

    const result = await getYigchungs("text-1", { includeContent: true });

    expect(mockedContent).toHaveBeenCalledWith("ed-1", 10, 15);
    expect(mockedContent).toHaveBeenCalledWith("ed-1", 20, 23);
    expect(mockedContent).not.toHaveBeenCalledWith("ed-1", 10, 23);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].label).toBe("a");
    expect(result.items[0].content).toBe("56789");
    expect(result.items[1].label).toBe("2");
    expect(result.items[1].content).toBe("012");
    expect(result.items[0].index).toBe(0);
    expect(result.items[1].index).toBe(1);
  });

  test("resolves anchor segment when the mark starts on a later line", async () => {
    mockedGet.mockResolvedValue([
      {
        id: "y1",
        edition_id: "ed-1",
        text_id: "text-1",
        span: { start: 15, end: 18 },
      },
    ]);
    mockedSpans.mockResolvedValue([
      {
        id: "s1",
        lines: [
          { start: 0, end: 10 },
          { start: 10, end: 20 },
        ],
      },
    ]);
    mockedContent.mockResolvedValue("abc");

    const result = await getYigchungs("text-1", { includeContent: true });

    expect(result.items[0].anchorSegmentId).toBe("s1");
  });

  test("metadata-only fetch skips segment scan and content requests", async () => {
    mockedGet.mockResolvedValue([
      {
        id: "y1",
        edition_id: "ed-1",
        text_id: "text-1",
        span: { start: 10, end: 15 },
      },
    ]);

    const result = await getYigchungs("text-1", { includeContent: false });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].content).toBe("");
    expect(mockedSpans).not.toHaveBeenCalled();
    expect(mockedContent).not.toHaveBeenCalled();
  });
});
