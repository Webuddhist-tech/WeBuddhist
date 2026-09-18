import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchAlignmentPairs: vi.fn(),
  fetchTextById: vi.fn(),
  fetchTextEditions: vi.fn(),
}));

import {
  fetchAlignmentPairs,
  fetchTextById,
  fetchTextEditions,
} from "./api.ts";
import {
  clearAlignmentCache,
  resolveTranslationSegmentIds,
} from "./alignments.ts";
import { LibraryError } from "./client.ts";
import type { LibraryText } from "./types.ts";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const asText = (fixture: Partial<LibraryText> & { id: string }): LibraryText =>
  ({
    title: {},
    language: "en",
    category_id: "cat",
    translations: [],
    commentaries: [],
    ...fixture,
  }) as LibraryText;

/**
 * Stand in for the alignment endpoint: `edges` maps "source->target" to the
 * segment pairs stored in that direction.
 */
const alignments = (edges: Record<string, [string, string][]>) => {
  mocked(fetchAlignmentPairs).mockImplementation(
    async (source: string, target: string) => {
      const pairs = edges[`${source}->${target}`];
      if (!pairs) return null;
      return {
        items: pairs.map(([s, t]) => ({
          source_segment: { id: s },
          target_segment: { id: t },
        })),
        has_more: false,
        offset: 0,
        limit: 500,
      };
    },
  );
};

/**
 * Stand in for the text endpoint, so ancestry can be walked past the parent the
 * caller already handed us. Texts left out have no `translation_of` of their
 * own, which is what makes them the top of a family.
 */
const texts = (family: Record<string, Partial<LibraryText>>) => {
  mocked(fetchTextById).mockImplementation(async (textId: string) =>
    family[textId] ? asText({ id: textId, ...family[textId] }) : null,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  clearAlignmentCache();
  mocked(fetchTextEditions).mockResolvedValue([]);
  mocked(fetchTextById).mockResolvedValue(null);
});

describe("resolveTranslationSegmentIds", () => {
  test("uses a direct alignment when one exists", async () => {
    alignments({
      "ed-a->ed-b": [
        ["a1", "b1"],
        ["a2", "b2"],
      ],
    });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1", "a2"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect(result.get("a1")).toEqual(["b1"]);
    expect(result.get("a2")).toEqual(["b2"]);
  });

  test("falls back to an alignment stored the other way round", async () => {
    alignments({ "ed-b->ed-a": [["b1", "a1"]] });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect(result.get("a1")).toEqual(["b1"]);
  });

  test("collects several target segments for one source segment", async () => {
    alignments({
      "ed-a->ed-b": [
        ["a1", "b1"],
        ["a1", "b2"],
      ],
    });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect(result.get("a1")).toEqual(["b1", "b2"]);
  });

  test("composes two translations through their shared root edition", async () => {
    // Neither translation is aligned to the other; both are aligned to the root.
    alignments({
      "ed-fr->ed-root": [["f1", "r1"]],
      "ed-zh->ed-root": [["z1", "r1"]],
    });
    mocked(fetchTextEditions).mockResolvedValue([
      { id: "ed-root", text_id: "t-root" },
    ]);

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["f1"],
      editionId: "ed-fr",
      editionTextId: "t-fr",
      editionText: asText({ id: "t-fr", translation_of: "t-root" }),
      versionEditionId: "ed-zh",
      versionTextId: "t-zh",
      versionText: asText({ id: "t-zh", translation_of: "t-root" }),
    });

    expect(result.get("f1")).toEqual(["z1"]);
  });

  test("composes through a grandparent when the family is three deep", async () => {
    // sa -> bo -> en. The open English text translates the Tibetan, which
    // translates the Sanskrit the reader picked. There is no en -> sa alignment
    // at all, so the path has to run through the Tibetan in between.
    alignments({
      "ed-en->ed-bo": [["e1", "b1"]],
      "ed-bo->ed-sa": [["b1", "s1"]],
    });
    texts({ "t-bo": { translation_of: "t-sa" } });
    mocked(fetchTextEditions).mockImplementation(async (textId: string) =>
      textId === "t-bo" ? [{ id: "ed-bo", text_id: "t-bo" }] : [],
    );

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["e1"],
      editionId: "ed-en",
      editionTextId: "t-en",
      editionText: asText({ id: "t-en", translation_of: "t-bo" }),
      versionEditionId: "ed-sa",
      versionTextId: "t-sa",
      versionText: asText({ id: "t-sa" }),
    });

    expect(result.get("e1")).toEqual(["s1"]);
  });

  test("composes between cousins two levels from the shared ancestor", async () => {
    // Two English translations made from different intermediaries: en-a from
    // the Tibetan, en-b straight from the Sanskrit both descend from.
    alignments({
      "ed-en-a->ed-bo": [["a1", "b1"]],
      "ed-bo->ed-sa": [["b1", "s1"]],
      "ed-en-b->ed-sa": [["x1", "s1"]],
    });
    texts({ "t-bo": { translation_of: "t-sa" } });
    mocked(fetchTextEditions).mockImplementation(async (textId: string) => {
      if (textId === "t-bo") return [{ id: "ed-bo", text_id: "t-bo" }];
      if (textId === "t-sa") return [{ id: "ed-sa", text_id: "t-sa" }];
      return [];
    });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-en-a",
      editionTextId: "t-en-a",
      editionText: asText({ id: "t-en-a", translation_of: "t-bo" }),
      versionEditionId: "ed-en-b",
      versionTextId: "t-en-b",
      versionText: asText({ id: "t-en-b", translation_of: "t-sa" }),
    });

    expect(result.get("a1")).toEqual(["x1"]);
  });

  test("stops walking a family that points back at itself", async () => {
    alignments({});
    texts({ "t-a": { translation_of: "t-b" }, "t-b": { translation_of: "t-a" } });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a", translation_of: "t-b" }),
      versionEditionId: "ed-z",
      versionTextId: "t-z",
      versionText: asText({ id: "t-z" }),
    });

    expect(result.size).toBe(0);
  });

  test("an unreachable ancestor is an error, not an absent translation", async () => {
    // Stopping the family walk on a 500 would report "no translation exists"
    // for a pair that is perfectly well aligned.
    alignments({ "ed-en->ed-bo": [["e1", "b1"]] });
    const upstream = new LibraryError("Failed to fetch text", 500);
    mocked(fetchTextById).mockRejectedValue(upstream);

    await expect(
      resolveTranslationSegmentIds({
        segmentIds: ["e1"],
        editionId: "ed-en",
        editionTextId: "t-en",
        editionText: asText({ id: "t-en", translation_of: "t-bo" }),
        versionEditionId: "ed-sa",
        versionTextId: "t-sa",
        versionText: asText({ id: "t-sa" }),
      }),
    ).rejects.toBe(upstream);
  });

  test("an ancestor that does not exist just ends the family", async () => {
    alignments({});
    mocked(fetchTextById).mockResolvedValue(null);

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["e1"],
      editionId: "ed-en",
      editionTextId: "t-en",
      editionText: asText({ id: "t-en", translation_of: "t-gone" }),
      versionEditionId: "ed-other",
      versionTextId: "t-other",
      versionText: asText({ id: "t-other" }),
    });

    expect(result.size).toBe(0);
  });

  test("an unreachable edition lookup propagates too", async () => {
    alignments({ "ed-fr->ed-root": [["f1", "r1"]] });
    const upstream = new LibraryError("Failed to fetch text editions", 503);
    mocked(fetchTextEditions).mockRejectedValue(upstream);

    await expect(
      resolveTranslationSegmentIds({
        segmentIds: ["f1"],
        editionId: "ed-fr",
        editionTextId: "t-fr",
        editionText: asText({ id: "t-fr", translation_of: "t-root" }),
        versionEditionId: "ed-zh",
        versionTextId: "t-zh",
        versionText: asText({ id: "t-zh", translation_of: "t-root" }),
      }),
    ).rejects.toBe(upstream);
  });

  test("a text with no editions of its own is an ordinary empty result", async () => {
    alignments({ "ed-fr->ed-root": [["f1", "r1"]] });
    mocked(fetchTextEditions).mockRejectedValue(
      new LibraryError("text editions not found", 404),
    );

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["f1"],
      editionId: "ed-fr",
      editionTextId: "t-fr",
      editionText: asText({ id: "t-fr", translation_of: "t-root" }),
      versionEditionId: "ed-zh",
      versionTextId: "t-zh",
      versionText: asText({ id: "t-zh", translation_of: "t-root" }),
    });

    expect(result.size).toBe(0);
  });

  test("gives up when the two texts share no root", async () => {
    alignments({});

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a", translation_of: "root-1" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b", translation_of: "root-2" }),
    });

    expect(result.size).toBe(0);
  });

  test("a missing alignment is an ordinary empty result, not an error", async () => {
    alignments({});

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect(result.size).toBe(0);
  });

  test("segments outside the alignment's coverage are simply skipped", async () => {
    alignments({ "ed-a->ed-b": [["a1", "b1"]] });

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1", "a2"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect([...result.keys()]).toEqual(["a1"]);
  });

  test("pages through a long alignment list", async () => {
    mocked(fetchAlignmentPairs).mockImplementation(
      async (_s: string, _t: string, _limit: number, offset: number) =>
        offset === 0
          ? {
              items: [
                { source_segment: { id: "a1" }, target_segment: { id: "b1" } },
              ],
              has_more: true,
              offset: 0,
              limit: 500,
            }
          : {
              items: [
                { source_segment: { id: "a2" }, target_segment: { id: "b2" } },
              ],
              has_more: false,
              offset: 1,
              limit: 500,
            },
    );

    const result = await resolveTranslationSegmentIds({
      segmentIds: ["a1", "a2"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    });

    expect(result.get("a2")).toEqual(["b2"]);
  });

  test("caches a pair list so paging the reader does not refetch it", async () => {
    alignments({ "ed-a->ed-b": [["a1", "b1"]] });
    const args = {
      segmentIds: ["a1"],
      editionId: "ed-a",
      editionTextId: "t-a",
      editionText: asText({ id: "t-a" }),
      versionEditionId: "ed-b",
      versionTextId: "t-b",
      versionText: asText({ id: "t-b" }),
    };

    await resolveTranslationSegmentIds(args);
    const callsAfterFirst = mocked(fetchAlignmentPairs).mock.calls.length;
    await resolveTranslationSegmentIds(args);

    expect(mocked(fetchAlignmentPairs).mock.calls.length).toBe(callsAfterFirst);
  });
});
