import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchRelatedSegments: vi.fn(),
  fetchSegmentContent: vi.fn(),
  fetchSegmentDetail: vi.fn(),
  fetchTextById: vi.fn(),
}));

vi.mock("./texts.ts", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  fetchTextSourceLink: vi.fn(async () => null),
}));

import {
  fetchRelatedSegments,
  fetchSegmentContent,
  fetchSegmentDetail,
  fetchTextById,
} from "./api.ts";
import {
  getSegmentById,
  getSegmentCommentaries,
  getSegmentInfo,
  getSegmentRootText,
  getSegmentTranslations,
} from "./segments.ts";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const detail = (lines: [number, number][], textId = "text-1") => ({
  id: "seg-1",
  text_id: textId,
  edition_id: "edition-1",
  segmentation_id: "segmentation-1",
  lines: lines.map(([start, end]) => ({ start, end })),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocked(fetchTextById).mockResolvedValue({
    id: "text-1",
    title: { en: "A Text" },
    language: "en",
    category_id: "cat-1",
    translation_of: "root-1",
  });
});

describe("segment line breaks", () => {
  test("splits the run-on content back into its lines", async () => {
    // /segments/{id}/content hands back the lines already concatenated.
    mocked(fetchSegmentContent).mockResolvedValue("oneXXtwoYYthree");
    mocked(fetchSegmentDetail).mockResolvedValue(
      detail([
        [100, 105],
        [105, 110],
        [110, 115],
      ]),
    );

    const result = await getSegmentById("seg-1");

    expect(result.content).toBe("oneXX\ntwoYY\nthree");
  });

  test("leaves a single-line segment alone", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("just one line");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 13]]));

    const result = await getSegmentById("seg-1");

    expect(result.content).toBe("just one line");
  });

  test("keeps the original text when the spans do not add up", async () => {
    // Line lengths total 10, the content is 15 - splitting would lose text, so
    // the API's own answer is kept instead.
    mocked(fetchSegmentContent).mockResolvedValue("oneXXtwoYYthree");
    mocked(fetchSegmentDetail).mockResolvedValue(
      detail([
        [0, 5],
        [5, 10],
      ]),
    );

    const result = await getSegmentById("seg-1");

    expect(result.content).toBe("oneXXtwoYYthree");
  });

  test("survives the detail lookup failing", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("oneXXtwoYY");
    mocked(fetchSegmentDetail).mockRejectedValue(new Error("upstream down"));

    const result = await getSegmentById("seg-1");

    expect(result.content).toBe("oneXXtwoYY");
  });

  test("a missing segment is a 404", async () => {
    mocked(fetchSegmentContent).mockResolvedValue(null);
    mocked(fetchSegmentDetail).mockResolvedValue(null);

    await expect(getSegmentById("seg-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  test("related segments in the panel get their lines too", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("oneXXtwoYY");
    mocked(fetchSegmentDetail).mockResolvedValue(
      detail([
        [0, 5],
        [5, 10],
      ]),
    );
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [{ id: "rel-1", text_id: "text-2" }],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const result = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(result.parent_segment.content).toBe("oneXX\ntwoYY");
    expect(result.translations[0].segments[0].content).toBe("oneXX\ntwoYY");
  });
});

describe("relations from anywhere in a family", () => {
  /**
   * The relationship lists live only on the root: a translation carries an empty
   * `translations`/`commentaries` and just a pointer back to what it translates.
   */
  const family = {
    root: {
      id: "root",
      title: { bo: "Root" },
      language: "bo",
      category_id: "cat-1",
      translations: ["fr", "zh"],
      commentaries: ["comm"],
      translation_of: null,
      commentary_of: null,
    },
    fr: {
      id: "fr",
      title: { fr: "French" },
      language: "fr",
      category_id: "cat-1",
      translations: [],
      commentaries: [],
      translation_of: "root",
      commentary_of: null,
    },
    zh: {
      id: "zh",
      title: { zh: "Chinese" },
      language: "zh",
      category_id: "cat-1",
      translations: [],
      commentaries: [],
      translation_of: "root",
      commentary_of: null,
    },
    comm: {
      id: "comm",
      title: { bo: "Commentary" },
      language: "bo",
      category_id: "cat-1",
      translations: [],
      commentaries: [],
      translation_of: null,
      commentary_of: "root",
    },
    // An English rendering of the commentary: it only points at what it
    // translates, never at the root the commentary is on.
    commEn: {
      id: "commEn",
      title: { en: "Commentary in English" },
      language: "en",
      category_id: "cat-1",
      translations: [],
      commentaries: [],
      translation_of: "comm",
      commentary_of: null,
    },
  };

  /** What /segments/{id}/related returns for the segment under test. */
  const relatedTo = (textIds: string[]) =>
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: textIds.map((textId, index) => ({
        id: `rel-${index}`,
        text_id: textId,
      })),
      has_more: false,
      offset: 0,
      limit: 100,
    });

  beforeEach(() => {
    mocked(fetchTextById).mockImplementation(
      async (id: string) => (family as Record<string, unknown>)[id] ?? null,
    );
  });

  test("the panel counts what its lists will actually show", async () => {
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 5]], "fr"));
    // Reading the French translation, this segment is aligned to the root, the
    // Chinese sibling and the commentary.
    relatedTo(["root", "zh", "comm", "fr"]);

    const result = await getSegmentInfo("seg-1");

    expect(result.segment_info).toMatchObject({
      text_id: "fr",
      // The sibling `zh` and the `root` it was translated from are both
      // translations. Only a commentary has a root text, so a translation's
      // original gets no button of its own. `fr` is the text being read.
      translations: 2,
      related_text: { commentaries: 1, root_text: 0 },
    });
  });

  test("a segment with nothing aligned to it offers no buttons", async () => {
    // Front matter is the usual case: its *text* comments on a root, but the
    // segment itself has no alignments, so opening the list showed nothing
    // while the button promised one root text.
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 5]], "fr"));
    relatedTo([]);

    const result = await getSegmentInfo("seg-1");

    expect(result.segment_info).toMatchObject({
      translations: 0,
      related_text: { commentaries: 0, root_text: 0 },
    });
  });

  test("the root counts its relations without counting itself", async () => {
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 5]], "root"));
    relatedTo(["fr", "zh", "comm", "root"]);

    const result = await getSegmentInfo("seg-1");

    expect(result.segment_info).toMatchObject({
      translations: 2,
      // The root comments on nothing, so it has no root text.
      related_text: { commentaries: 1, root_text: 0 },
    });
  });

  test("the text being read is not listed among its own relations", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [
        // Another segment of the very text being read, which the related
        // lookup also returns.
        { id: "own-2", text_id: "fr" },
        { id: "rel-1", text_id: "zh" },
      ],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const result = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(result.translations.map((g) => g.text_id)).toEqual(["zh"]);
  });

  test("everything that is not a commentary is a translation, if it is text", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [
        // The root carries neither pointer, and `other` is not in the family at
        // all. Both used to match no list and vanish from the panel.
        { id: "rel-1", text_id: "root" },
        { id: "rel-2", text_id: "zh" },
        { id: "rel-3", text_id: "other" },
        { id: "rel-4", text_id: "comm" },
      ],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const result = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(result.translations.map((g) => g.text_id)).toEqual([
      "root",
      "zh",
      "other",
    ]);
  });

  test("structural segments stay in the list, labelled with their type", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [
        // A verse, a title and a colophon of the same text, plus a segment with
        // no type at all. None of them route anywhere different; the type only
        // decides what the panel labels each entry.
        { id: "rel-1", text_id: "zh", type: "verse" },
        { id: "rel-2", text_id: "zh", type: "title" },
        { id: "rel-3", text_id: "root", type: "front_matter" },
        { id: "rel-4", text_id: "root", type: "back_matter" },
        { id: "rel-5", text_id: "other" },
      ],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const result = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(result.translations.map((g) => g.text_id)).toEqual([
      "zh",
      "root",
      "other",
    ]);
    // The type reaches the panel, which labels each entry with it. An unset one
    // stays null so the label is skipped rather than guessing "paragraph".
    expect(result.translations[0].segments.map((s) => s.type)).toEqual([
      "verse",
      "title",
    ]);
    expect(result.translations[1].segments.map((s) => s.type)).toEqual([
      "front_matter",
      "back_matter",
    ]);
    expect(result.translations[2].segments[0].type).toBeNull();
  });

  test("a commentary stays a commentary whatever its segments look like", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [{ id: "rel-1", text_id: "comm", type: "front_matter" }],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const translations = await getSegmentTranslations({ segmentId: "seg-1" });
    const commentaries = await getSegmentCommentaries({ segmentId: "seg-1" });

    expect(translations.translations).toEqual([]);
    expect(commentaries.commentaries.map((g) => g.text_id)).toEqual(["comm"]);
  });

  test("the list is not cut short by segments of another type coming first", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    // Ten commentary segments arrive before either translation. Asking the API
    // for ten and filtering afterwards left the translations list empty while
    // its button still said two, so the mock has to honour `limit` to show it.
    const all = [
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `c-${i}`,
        text_id: "comm",
        type: "verse",
      })),
      { id: "t-1", text_id: "zh", type: "verse" },
      { id: "t-2", text_id: "root", type: "verse" },
    ];
    mocked(fetchRelatedSegments).mockImplementation(
      async (_segmentId: string, params: { limit: number; offset: number }) => {
        const items = all.slice(params.offset, params.offset + params.limit);
        return {
          items,
          has_more: params.offset + items.length < all.length,
          offset: params.offset,
          limit: params.limit,
        };
      },
    );

    const info = await getSegmentInfo("seg-1");
    const list = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(info.segment_info.translations).toBe(2);
    expect(list.translations).toHaveLength(2);
    expect(list.translations.map((g) => g.text_id)).toEqual(["zh", "root"]);
  });

  test("a translation past the first page of related segments still shows", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "fr"));
    const all = [
      ...Array.from({ length: 120 }, (_, i) => ({
        id: `c-${i}`,
        text_id: "comm",
        type: "verse",
      })),
      { id: "t-1", text_id: "zh", type: "verse" },
    ];
    mocked(fetchRelatedSegments).mockImplementation(
      async (_segmentId: string, params: { limit: number; offset: number }) => {
        const items = all.slice(params.offset, params.offset + params.limit);
        return {
          items,
          has_more: params.offset + items.length < all.length,
          offset: params.offset,
          limit: params.limit,
        };
      },
    );

    const info = await getSegmentInfo("seg-1");
    const list = await getSegmentTranslations({ segmentId: "seg-1" });

    expect(info.segment_info.translations).toBe(1);
    expect(list.translations.map((g) => g.text_id)).toEqual(["zh"]);
  });

  test("a translated commentary is a commentary, not a translation", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "root"));
    relatedTo(["fr", "comm", "commEn"]);

    const info = await getSegmentInfo("seg-1");
    const translations = await getSegmentTranslations({ segmentId: "seg-1" });
    const commentaries = await getSegmentCommentaries({ segmentId: "seg-1" });

    expect(info.segment_info).toMatchObject({
      translations: 1,
      related_text: { commentaries: 2, root_text: 0 },
    });
    expect(translations.translations.map((g) => g.text_id)).toEqual(["fr"]);
    expect(commentaries.commentaries.map((g) => g.text_id)).toEqual([
      "comm",
      "commEn",
    ]);
  });

  test("reading a commentary, the root in any language is its root text", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "comm"));
    relatedTo(["root", "fr", "commEn"]);

    const info = await getSegmentInfo("seg-1");
    const translations = await getSegmentTranslations({ segmentId: "seg-1" });
    const rootText = await getSegmentRootText({ segmentId: "seg-1" });

    expect(info.segment_info).toMatchObject({
      translations: 1,
      related_text: { commentaries: 0, root_text: 2 },
    });
    // Its own English rendering is the commentary's translation...
    expect(translations.translations.map((g) => g.text_id)).toEqual([
      "commEn",
    ]);
    // ...while the work it comments on is the root, not a translation.
    expect(rootText.root_text.map((g) => g.text_id)).toEqual(["root", "fr"]);
  });

  test("reading a translated commentary, the root is the commented work", async () => {
    mocked(fetchSegmentContent).mockResolvedValue("text");
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 4]], "commEn"));
    relatedTo(["comm", "root", "zh"]);

    const translations = await getSegmentTranslations({ segmentId: "seg-1" });
    const rootText = await getSegmentRootText({ segmentId: "seg-1" });

    expect(translations.translations.map((g) => g.text_id)).toEqual(["comm"]);
    expect(rootText.root_text.map((g) => g.text_id)).toEqual(["root", "zh"]);
  });

  test("the panel counts each text once, however many segments it has", async () => {
    mocked(fetchSegmentDetail).mockResolvedValue(detail([[0, 5]], "fr"));
    mocked(fetchRelatedSegments).mockResolvedValue({
      items: [
        { id: "rel-1", text_id: "zh", type: "verse" },
        { id: "rel-2", text_id: "zh", type: "title" },
        { id: "rel-3", text_id: "root", type: "verse" },
        { id: "rel-4", text_id: "comm", type: "verse" },
      ],
      has_more: false,
      offset: 0,
      limit: 100,
    });

    const result = await getSegmentInfo("seg-1");

    expect(result.segment_info).toMatchObject({
      // `zh` contributes two segments but is one entry in the list, so the
      // button says two texts rather than three segments.
      translations: 2,
      related_text: { commentaries: 1, root_text: 0 },
    });
  });
});
