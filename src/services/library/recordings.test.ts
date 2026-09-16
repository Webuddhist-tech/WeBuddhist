import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./client.ts", () => ({
  libraryGet: vi.fn(),
  libraryGetOrNull: vi.fn(),
}));

import { libraryGetOrNull } from "./client.ts";
import { fetchEditionRecordings, recordingAudioUrl } from "./api.ts";

const mockedGetOrNull = libraryGetOrNull as ReturnType<typeof vi.fn>;

describe("edition recordings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("recordingAudioUrl points at the library audio redirect", () => {
    expect(recordingAudioUrl("13bXPugHWOc6obg9ARtRO")).toBe(
      "/library/v2/recordings/13bXPugHWOc6obg9ARtRO/audio",
    );
  });

  test("fetchEditionRecordings returns the upstream list", async () => {
    const recordings = [{ id: "rec-1", edition_id: "ed-1", text_id: "t-1" }];
    mockedGetOrNull.mockResolvedValue(recordings);

    const result = await fetchEditionRecordings("ed-1");

    expect(result).toEqual(recordings);
    expect(mockedGetOrNull).toHaveBeenCalledWith(
      "/v2/editions/ed-1/recordings",
      undefined,
      "edition recordings",
    );
  });

  test("fetchEditionRecordings returns an empty list when the edition has none", async () => {
    mockedGetOrNull.mockResolvedValue(null);

    await expect(fetchEditionRecordings("missing")).resolves.toEqual([]);
  });
});
