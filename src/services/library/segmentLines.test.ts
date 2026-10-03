import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchSegmentDetail: vi.fn(),
  fetchEditionContent: vi.fn(),
}));
vi.mock("./textDetails.ts", () => ({
  getAllSegmentSpans: vi.fn(),
}));
vi.mock("./yigchungMarks.ts", () => ({
  getYigchungMarkSpans: vi.fn(),
}));

import { fetchEditionContent, fetchSegmentDetail } from "./api.ts";
import { getAllSegmentSpans } from "./textDetails.ts";
import { getYigchungMarkSpans } from "./yigchungMarks.ts";
import { getAnnotatedSegments } from "./segmentLines.ts";

const mockedDetail = vi.mocked(fetchSegmentDetail);
const mockedContent = vi.mocked(fetchEditionContent);
const mockedSpans = vi.mocked(getAllSegmentSpans);
const mockedMarks = vi.mocked(getYigchungMarkSpans);

// "Homage to Tara," + "swift heroine " + "(three times)" + "Om tare"
// 0              15            29           42     49
const EDITION = "Homage to Tara,swift heroine (three times)Om tare";

const plain = (text: string) => [{ text, yigchung: false }];

describe("getAnnotatedSegments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDetail.mockResolvedValue({
      id: "v1",
      lines: [],
      segmentation_id: "seg",
      edition_id: "ed-1",
      text_id: "text-1",
    });
    mockedSpans.mockResolvedValue([
      {
        id: "v1",
        type: "verse",
        reference: "1-1",
        lines: [
          { start: 15, end: 42 },
          { start: 0, end: 15 },
        ],
      },
      {
        id: "v2",
        type: "verse",
        reference: "1-2",
        lines: [{ start: 42, end: 49 }],
      },
      { id: "elsewhere", lines: [{ start: 49, end: 90 }] },
    ]);
    mockedMarks.mockResolvedValue([{ span: { start: 29, end: 42 }, index: 0 }]);
    mockedContent.mockImplementation(async (_edition, start = 0, end) =>
      Array.from(EDITION).slice(start, end).join(""),
    );
  });

  test("breaks each segment into its lines, in order, with yigchung marked", async () => {
    const annotated = await getAnnotatedSegments(["v1", "v2"]);

    expect(annotated.get("v1")).toEqual({
      lines: [
        plain("Homage to Tara,"),
        [
          { text: "swift heroine ", yigchung: false },
          { text: "(three times)", yigchung: true },
        ],
      ],
      reference: "1-1",
      type: "verse",
    });
    expect(annotated.get("v2")?.lines).toEqual([plain("Om tare")]);
  });

  test("reads the edition from the first segment and its content in one request", async () => {
    await getAnnotatedSegments(["v1", "v2"]);

    expect(mockedDetail).toHaveBeenCalledWith("v1");
    expect(mockedSpans).toHaveBeenCalledWith("ed-1");
    expect(mockedContent).toHaveBeenCalledTimes(1);
    expect(mockedContent).toHaveBeenCalledWith("ed-1", 0, 49);
  });

  test("leaves out segments the edition does not have", async () => {
    const annotated = await getAnnotatedSegments(["v2", "unknown"]);

    expect([...annotated.keys()]).toEqual(["v2"]);
  });

  test("keeps the lines when the yigchung marks fail to load", async () => {
    mockedMarks.mockRejectedValue(new Error("down"));

    const annotated = await getAnnotatedSegments(["v1"]);

    expect(annotated.get("v1")?.lines).toEqual([
      plain("Homage to Tara,"),
      plain("swift heroine (three times)"),
    ]);
  });

  test("is empty when the library cannot place the first segment", async () => {
    mockedDetail.mockResolvedValue(null);

    const annotated = await getAnnotatedSegments(["v1"]);

    expect(annotated.size).toBe(0);
    expect(mockedContent).not.toHaveBeenCalled();
  });

  test("asks for nothing when given no segments", async () => {
    const annotated = await getAnnotatedSegments([]);

    expect(annotated.size).toBe(0);
    expect(mockedDetail).not.toHaveBeenCalled();
  });
});
