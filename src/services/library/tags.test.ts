import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchTags: vi.fn(),
}));

import { fetchTags } from "./api.ts";
import { getTags, getTagsById } from "./tags.ts";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const tags = [
  {
    id: "tag-1",
    title: { en: "Vajrayāna", bo: "རྡོ་རྗེ་ཐེག་པ།" },
    description: { en: "Buddhist tradition of the text" },
  },
  { id: "tag-2", title: { en: "Chants" }, description: null },
];

describe("getTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked(fetchTags).mockResolvedValue(tags);
  });

  test("resolves each label in the requested language", async () => {
    expect(await getTags("bo")).toEqual([
      {
        id: "tag-1",
        title: "རྡོ་རྗེ་ཐེག་པ།",
        description: "Buddhist tradition of the text",
      },
      { id: "tag-2", title: "Chants", description: null },
    ]);
  });

  test("falls back to another language rather than a blank label", async () => {
    const [vajrayana] = await getTags("vi");
    expect(vajrayana.title).toBe("Vajrayāna");
  });

  test("keys the same list by id", async () => {
    const byId = await getTagsById("en");
    expect(byId.get("tag-1")?.title).toBe("Vajrayāna");
    expect(byId.get("missing")).toBeUndefined();
  });
});
