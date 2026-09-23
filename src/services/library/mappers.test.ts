import { describe, test, expect } from "vitest";
import { mapContributors } from "./mappers.ts";
import type { LibraryContribution } from "./types.ts";

const contributions: LibraryContribution[] = [
  {
    type: "person",
    id: "p1",
    bdrc_id: "P2551",
    role: "translator",
    name: { bo: "རྔོག་བློ་ལྡན་ཤེས་རབ།" },
  },
  {
    type: "person",
    id: "p2",
    role: "author",
    name: { bo: "མཁན་པོ།", sa: "Sarvajñadeva" },
  },
];

describe("mapContributors", () => {
  test("resolves each name in the requested language", () => {
    expect(mapContributors(contributions, "sa")).toEqual([
      { type: "person", name: "རྔོག་བློ་ལྡན་ཤེས་རབ།", role: "translator" },
      { type: "person", name: "Sarvajñadeva", role: "author" },
    ]);
  });

  test("falls back to another script rather than a blank name", () => {
    expect(mapContributors(contributions, "en")[1].name).toBe("མཁན་པོ།");
  });

  test("drops a person the library cannot name, keeping AI credits", () => {
    expect(
      mapContributors(
        [
          { type: "person", id: "p3", role: "scholar" },
          { type: "ai", id: "model-1", role: "translator" },
        ],
        "en",
      ),
    ).toEqual([{ type: "ai", name: "", role: "translator" }]);
  });

  test("treats a text with no contributions as having no credits", () => {
    expect(mapContributors(undefined, "en")).toEqual([]);
  });
});
