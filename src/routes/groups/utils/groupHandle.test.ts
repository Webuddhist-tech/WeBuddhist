import { describe, expect, it } from "vitest";
import { groupPath, groupPathById, parseGroupHandle } from "./groupHandle.ts";

const ID = "589bd8ab-d3db-4d42-a61a-9a34841daf49";

describe("parseGroupHandle", () => {
  it("reads @slug as the group's slug", () => {
    expect(parseGroupHandle("@dzongsar-drolma-bumtsok")).toEqual({
      slug: "dzongsar-drolma-bumtsok",
    });
  });

  it("reads an encoded @ the same way", () => {
    expect(parseGroupHandle("%40webuddhist")).toEqual({ slug: "webuddhist" });
  });

  it("reads a bare UUID as the group's id", () => {
    expect(parseGroupHandle(ID.toUpperCase())).toEqual({ id: ID });
  });

  it("refuses anything else", () => {
    expect(parseGroupHandle("@")).toBeNull();
    expect(parseGroupHandle("webuddhist")).toBeNull();
    expect(parseGroupHandle(undefined)).toBeNull();
  });
});

describe("group paths", () => {
  it("names a group by its slug", () => {
    expect(groupPath("webuddhist")).toBe("/group/@webuddhist");
  });

  it("falls back to the id when that is all a page has", () => {
    expect(groupPathById(ID)).toBe(`/group/${ID}`);
  });
});
