import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotatedSegment } from "@/services/library/segmentLines.ts";
import type { RecitationTextDTO } from "../types.ts";

const postMock = vi.fn();
vi.mock("../../../config/axios-config.ts", () => ({
  default: { post: (...args: unknown[]) => postMock(...args) },
}));

const getAnnotatedSegmentsMock = vi.fn();
vi.mock("@/services/library/segmentLines.ts", () => ({
  getAnnotatedSegments: (ids: string[]) => getAnnotatedSegmentsMock(ids),
}));

import { fetchRecitationText } from "./eventsApi.ts";

const liturgy: RecitationTextDTO = {
  text_id: "tara",
  title: "Tara",
  segments: [
    {
      recitation: { bo: { id: "bo-1", content: "ཕྱག་འཚལ།" } },
      translations: { en: { id: "en-1", content: "Homage" } },
    },
  ],
};

const segment = (text: string): AnnotatedSegment => ({
  lines: [[{ text, yigchung: false }]],
  reference: "1-1",
  type: "verse",
});

describe("fetchRecitationText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postMock.mockResolvedValue({ data: liturgy });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("brings the library's lines for the recited edition and the reader's translation", async () => {
    getAnnotatedSegmentsMock.mockImplementation(async (ids: string[]) =>
      ids[0] === "bo-1"
        ? new Map([["bo-1", segment("ཕྱག་འཚལ།")]])
        : new Map([["en-1", segment("Homage")]]),
    );

    const text = await fetchRecitationText("tara", "en");

    expect(getAnnotatedSegmentsMock).toHaveBeenCalledWith(["bo-1"]);
    expect(getAnnotatedSegmentsMock).toHaveBeenCalledWith(["en-1"]);
    expect(text.language).toBe("bo");
    expect([...(text.annotations?.keys() ?? [])]).toEqual(["bo-1", "en-1"]);
  });

  it("keeps one edition's lines when the other's fail", async () => {
    getAnnotatedSegmentsMock.mockImplementation(async (ids: string[]) => {
      if (ids[0] === "en-1") throw new Error("library down");
      return new Map([["bo-1", segment("ཕྱག་འཚལ།")]]);
    });

    const text = await fetchRecitationText("tara", "en");

    expect([...(text.annotations?.keys() ?? [])]).toEqual(["bo-1"]);
  });

  it("shows the text without them rather than wait on a stalled library", async () => {
    vi.useFakeTimers();
    getAnnotatedSegmentsMock.mockReturnValue(new Promise(() => {}));

    const loading = fetchRecitationText("tara", "en");
    await vi.advanceTimersByTimeAsync(6000);
    const text = await loading;

    expect(text.title).toBe("Tara");
    expect(text.annotations?.size).toBe(0);
  });

  it("keeps the recited lines when only the translation stalls", async () => {
    vi.useFakeTimers();
    getAnnotatedSegmentsMock.mockImplementation((ids: string[]) =>
      ids[0] === "bo-1"
        ? Promise.resolve(new Map([["bo-1", segment("ཕྱག་འཚལ།")]]))
        : new Promise(() => {}),
    );

    const loading = fetchRecitationText("tara", "en");
    await vi.advanceTimersByTimeAsync(6000);
    const text = await loading;

    expect([...(text.annotations?.keys() ?? [])]).toEqual(["bo-1"]);
  });
});
