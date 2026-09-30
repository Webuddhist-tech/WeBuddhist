import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./client.ts", () => ({
  libraryGet: vi.fn(),
}));

import { libraryGet } from "./client.ts";
import {
  clearYigchungMarksCache,
  getYigchungMarkSpans,
} from "./yigchungMarks.ts";

describe("getYigchungMarkSpans", () => {
  beforeEach(() => {
    clearYigchungMarksCache();
    vi.mocked(libraryGet).mockReset();
  });

  test("sorts marks and assigns stable indices", async () => {
    vi.mocked(libraryGet).mockResolvedValue([
      {
        id: "m2",
        edition_id: "ed-1",
        text_id: "t1",
        span: { start: 10, end: 12 },
      },
      {
        id: "m1",
        edition_id: "ed-1",
        text_id: "t1",
        span: { start: 2, end: 5 },
      },
    ]);

    const marks = await getYigchungMarkSpans("ed-1");
    expect(marks).toEqual([
      { span: { start: 2, end: 5 }, index: 0 },
      { span: { start: 10, end: 12 }, index: 1 },
    ]);
    expect(libraryGet).toHaveBeenCalledTimes(1);

    await getYigchungMarkSpans("ed-1");
    expect(libraryGet).toHaveBeenCalledTimes(1);
  });

  test("does not cache failed mark requests", async () => {
    vi.mocked(libraryGet)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce([
        {
          id: "m1",
          edition_id: "ed-1",
          text_id: "t1",
          span: { start: 0, end: 2 },
        },
      ]);

    await expect(getYigchungMarkSpans("ed-1")).rejects.toThrow("network");
    const marks = await getYigchungMarkSpans("ed-1");
    expect(marks).toHaveLength(1);
    expect(libraryGet).toHaveBeenCalledTimes(2);
  });
});
