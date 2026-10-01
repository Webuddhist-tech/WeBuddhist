import { describe, expect, it } from "vitest";
import {
  groupAddress,
  groupPath,
  groupPathById,
  hasSlugAddress,
  parseGroupHandle,
} from "./groupHandle.ts";

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

describe("groupAddress", () => {
  const group = {
    id: ID,
    slug: "dzongsar",
    is_public: true,
    status: "PUBLISHED",
  };

  it("names a published public group by its slug", () => {
    expect(hasSlugAddress(group)).toBe(true);
    expect(groupAddress(group)).toBe("/group/@dzongsar");
  });

  it("keeps the id for a group the public listing leaves out", () => {
    expect(groupAddress({ ...group, is_public: false })).toBe(`/group/${ID}`);
    expect(groupAddress({ ...group, status: "DRAFT" })).toBe(`/group/${ID}`);
  });
});
