import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("../../../config/axios-config.ts", () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}));

import {
  findGroupIdBySlug,
  GroupNotFoundError,
  resolveGroupId,
} from "./groupsApi.ts";

type Params = { group_type: string; skip: number; limit: number };

const listing = (pages: Record<string, { slug: string; id: string }[][]>) =>
  getMock.mockImplementation(
    async (_url: string, { params }: { params: Params }) => {
      const groupPages = pages[params.group_type] ?? [];
      const all = groupPages.flat();
      const page = groupPages[params.skip / params.limit] ?? [];
      return { data: { groups: page, total: all.length, skip: params.skip } };
    },
  );

const fullPage = (prefix: string) =>
  Array.from({ length: 100 }, (_, index) => ({
    slug: `${prefix}-${index}`,
    id: `${prefix}-id-${index}`,
  }));

describe("findGroupIdBySlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("finds a community by its slug, ignoring case", async () => {
    listing({ COMMUNITY: [[{ slug: "webuddhist", id: "g1" }]] });

    expect(await findGroupIdBySlug("WeBuddhist")).toBe("g1");
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("pages through the listing, then looks among the pages", async () => {
    listing({
      COMMUNITY: [fullPage("c"), [{ slug: "last", id: "c-last" }]],
      PAGE: [[{ slug: "shantideva", id: "p1" }]],
    });

    expect(await findGroupIdBySlug("shantideva")).toBe("p1");
    expect(getMock.mock.calls.map(([, { params }]) => params)).toEqual([
      { group_type: "COMMUNITY", limit: 100, skip: 0 },
      { group_type: "COMMUNITY", limit: 100, skip: 100 },
      { group_type: "PAGE", limit: 100, skip: 0 },
    ]);
  });

  it("is null when no public group has the slug", async () => {
    listing({ COMMUNITY: [[{ slug: "webuddhist", id: "g1" }]] });

    expect(await findGroupIdBySlug("nobody")).toBeNull();
  });
});

describe("resolveGroupId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("takes an id as it is, without asking", async () => {
    expect(await resolveGroupId({ id: "g1" })).toBe("g1");
    expect(getMock).not.toHaveBeenCalled();
  });

  it("says plainly when a slug names no group", async () => {
    listing({});

    await expect(resolveGroupId({ slug: "nobody" })).rejects.toBeInstanceOf(
      GroupNotFoundError,
    );
  });
});
