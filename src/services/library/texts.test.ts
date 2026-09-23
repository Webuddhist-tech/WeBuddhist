import { describe, test, expect, beforeEach, vi } from "vitest";

vi.mock("./api.ts", () => ({
  fetchTextById: vi.fn(),
  fetchTextEditions: vi.fn(),
  fetchTexts: vi.fn(),
  fetchEdition: vi.fn(),
  fetchCategoryById: vi.fn(),
}));

import {
  fetchCategoryById,
  fetchEdition,
  fetchTextById,
  fetchTextEditions,
  fetchTexts,
} from "./api.ts";
import {
  getTextCommentaries,
  getTextLanguages,
  getTextVersions,
  getTextsByCollection,
  searchTitles,
} from "./texts.ts";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

type TextFixture = {
  id: string;
  title?: Record<string, string>;
  language?: string;
  translations?: string[];
  commentaries?: string[];
  translation_of?: string | null;
  commentary_of?: string | null;
};

const text = (fixture: TextFixture) => ({
  category_id: "cat-1",
  license: "public",
  title: { en: fixture.id },
  language: "en",
  translations: [],
  commentaries: [],
  translation_of: null,
  commentary_of: null,
  ...fixture,
});

/** Back the fetchTextById mock with a small in-memory graph of texts. */
const graph = (texts: ReturnType<typeof text>[]) => {
  const byId = new Map(texts.map((t) => [t.id, t]));
  mocked(fetchTextById).mockImplementation(
    async (id: string) => byId.get(id) ?? null,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked(fetchTextEditions).mockResolvedValue([]);
  mocked(fetchEdition).mockResolvedValue(null);
});

describe("getTextVersions precedence", () => {
  test("uses the text's own translations", async () => {
    graph([
      text({ id: "root", translations: ["fr", "de"] }),
      text({ id: "fr", language: "fr" }),
      text({ id: "de", language: "de" }),
    ]);

    const result = await getTextVersions({ textId: "root" });

    expect(result.versions.map((v) => v.id)).toEqual(["fr", "de"]);
    expect(result.text?.id).toBe("root");
  });

  test("prefers its own translations even when it is itself a translation", async () => {
    // translation_of says what this text is a translation OF; it says nothing
    // about what has been translated FROM it, so the own list must win.
    graph([
      text({ id: "mid", translation_of: "source", translations: ["fr"] }),
      text({ id: "source", translations: ["mid", "zh"] }),
      text({ id: "fr", language: "fr" }),
      text({ id: "zh", language: "zh" }),
    ]);

    const result = await getTextVersions({ textId: "mid" });

    expect(result.versions.map((v) => v.id)).toEqual(["fr"]);
  });

  test("climbs to the parent, and the parent is a version too", async () => {
    graph([
      text({ id: "mid", translation_of: "source", translations: [] }),
      text({ id: "source", translations: ["mid", "zh"] }),
      text({ id: "zh", language: "zh" }),
    ]);

    const result = await getTextVersions({ textId: "mid" });

    // The text being read is excluded; the one it translates is not - without it
    // there is no way back to the root from any of its translations.
    expect(result.versions.map((v) => v.id)).toEqual(["source", "zh"]);
  });

  test("a commentary offers the versions of the text it comments on", async () => {
    graph([
      text({ id: "comm", commentary_of: "root" }),
      text({ id: "root", translations: ["fr", "zh"], commentaries: ["comm"] }),
      text({ id: "fr", language: "fr" }),
      text({ id: "zh", language: "zh" }),
    ]);

    const result = await getTextVersions({ textId: "comm" });

    expect(result.versions.map((v) => v.id)).toEqual(["root", "fr", "zh"]);
  });

  test("borrows from a related commentary only when it has no translations", async () => {
    graph([
      text({ id: "root", translations: [], commentaries: ["comm"] }),
      text({ id: "comm", translations: ["fr"] }),
      text({ id: "fr", language: "fr" }),
    ]);

    const result = await getTextVersions({ textId: "root" });

    expect(result.versions.map((v) => v.id)).toEqual(["fr"]);
  });

  test("a commentary does not borrow versions from its siblings", async () => {
    graph([
      text({ id: "comm", commentary_of: "root", commentaries: ["other"] }),
      text({ id: "other", translations: ["fr"] }),
    ]);

    const result = await getTextVersions({ textId: "comm" });

    expect(result.versions).toEqual([]);
  });

  test("filters by language and paginates", async () => {
    graph([
      text({ id: "root", translations: ["fr", "fr2", "de"] }),
      text({ id: "fr", language: "fr" }),
      text({ id: "fr2", language: "fr" }),
      text({ id: "de", language: "de" }),
    ]);

    const all = await getTextVersions({ textId: "root", language: "fr" });
    expect(all.versions.map((v) => v.id)).toEqual(["fr", "fr2"]);

    const paged = await getTextVersions({
      textId: "root",
      language: "fr",
      skip: 1,
      limit: 1,
    });
    expect(paged.versions.map((v) => v.id)).toEqual(["fr2"]);
  });

  test("an unknown text is a 404", async () => {
    graph([]);
    await expect(getTextVersions({ textId: "nope" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("getTextLanguages", () => {
  test("counts versions per language", async () => {
    graph([
      text({
        id: "root",
        title: { en: "Root" },
        translations: ["a", "b", "c"],
      }),
      text({ id: "a", language: "fr" }),
      text({ id: "b", language: "fr" }),
      text({ id: "c", language: "zh" }),
    ]);

    const result = await getTextLanguages("root");

    expect(result.title).toBe("Root");
    expect(result.available_languages).toEqual([
      { language: "fr", language_code: "fr", version_count: 2 },
      { language: "zh", language_code: "zh", version_count: 1 },
    ]);
  });
});

describe("getTextCommentaries precedence", () => {
  test("a commentary reports its parent's commentaries", async () => {
    graph([
      text({ id: "comm", commentary_of: "root" }),
      text({ id: "root", commentaries: ["comm", "comm2"] }),
      text({ id: "comm2" }),
    ]);

    const result = await getTextCommentaries({ textId: "comm" });

    // Its own entry in the family's list is not a commentary on itself.
    expect(result.map((c) => c.id)).toEqual(["comm2"]);
  });

  test("a translation reports the commentaries of the text it translates", async () => {
    graph([
      text({ id: "fr", translation_of: "root", commentaries: [] }),
      text({ id: "root", commentaries: ["c1", "c2"] }),
      text({ id: "c1" }),
      text({ id: "c2" }),
    ]);

    const result = await getTextCommentaries({ textId: "fr" });

    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  test("a root text with both translations and commentaries reports its own", async () => {
    graph([
      text({ id: "root", translations: ["en"], commentaries: ["c1", "c2"] }),
      text({ id: "en", translation_of: "root" }),
      text({ id: "c1", commentary_of: "root" }),
      text({ id: "c2", commentary_of: "root" }),
    ]);

    const result = await getTextCommentaries({ textId: "root" });

    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  test("a root text with related texts reads through the first of them", async () => {
    graph([
      text({ id: "root", translations: ["fr"], commentaries: [] }),
      text({ id: "fr", commentaries: ["c1"] }),
      text({ id: "c1" }),
    ]);

    const result = await getTextCommentaries({ textId: "root" });

    expect(result.map((c) => c.id)).toEqual(["c1"]);
  });

  test("otherwise reports its own commentaries", async () => {
    graph([
      text({ id: "root", translation_of: "src", commentaries: ["c1", "c2"] }),
      text({ id: "c1" }),
      text({ id: "c2" }),
    ]);

    const result = await getTextCommentaries({
      textId: "root",
      skip: 1,
      limit: 1,
    });

    expect(result.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("getTextsByCollection", () => {
  test("maps texts and resolves the collection title", async () => {
    mocked(fetchTexts).mockResolvedValue({
      items: [text({ id: "t1", title: { en: "One", bo: "གཅིག" } })],
      has_more: true,
      offset: 0,
      limit: 10,
    });
    mocked(fetchCategoryById).mockResolvedValue({
      id: "cat-1",
      title: { en: "Liturgy" },
    });

    const result = await getTextsByCollection({
      collectionId: "cat-1",
      language: "en",
      limit: 10,
    });

    expect(result.collection).toEqual({ id: "cat-1", title: "Liturgy" });
    expect(result.texts).toEqual([
      {
        id: "t1",
        title: "One",
        language: "en",
        license: "public",
        tag_ids: [],
      },
    ]);
    expect(result.has_more).toBe(true);
  });

  test("skips the category lookup when listing without a collection", async () => {
    mocked(fetchTexts).mockResolvedValue({
      items: [],
      has_more: false,
      offset: 0,
      limit: 10,
    });

    const result = await getTextsByCollection({});

    expect(fetchCategoryById).not.toHaveBeenCalled();
    expect(result.collection).toBeNull();
  });
});

describe("searchTitles", () => {
  test("returns each text as its first critical edition", async () => {
    mocked(fetchTexts).mockResolvedValue({
      items: [text({ id: "t1", title: { en: "One" } }), text({ id: "t2" })],
      has_more: false,
      offset: 0,
      limit: 20,
    });
    mocked(fetchTextEditions).mockImplementation(async (id: string) =>
      id === "t1" ? [{ id: "e1", text_id: "t1" }] : [],
    );

    const result = await searchTitles({ title: "on" });

    // t2 has no edition, so it cannot be opened and is dropped.
    expect(result).toEqual([{ id: "e1", title: "One" }]);
  });
});
