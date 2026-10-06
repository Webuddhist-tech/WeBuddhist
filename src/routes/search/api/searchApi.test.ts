import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("../../../config/axios-config.ts", () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}));

import { searchGroups } from "./searchApi.ts";

type Params = { group_type: string; skip: number; limit: number };

const listing = (byType: Record<string, { ids: string[]; total: number }>) =>
  getMock.mockImplementation(
    async (_url: string, { params }: { params: Params }) => {
      const { ids, total } = byType[params.group_type] ?? { ids: [], total: 0 };
      return { data: { groups: ids.map((id) => ({ id })), total } };
    },
  );

const search = (query: string, skip = 0) =>
  searchGroups({ query, language: "en", limit: 10, skip });

describe("searchGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for communities and pages, including joined spaces", async () => {
    listing({});

    await search("sakya");

    expect(getMock).toHaveBeenCalledTimes(2);
    for (const groupType of ["COMMUNITY", "PAGE"]) {
      expect(getMock).toHaveBeenCalledWith("/api/v1/author/groups", {
        params: {
          search: "sakya",
          language: "en",
          group_type: groupType,
          include_joined: true,
          limit: 10,
          skip: 0,
        },
      });
    }
  });

  it("puts both kinds together and adds up their totals", async () => {
    listing({
      COMMUNITY: { ids: ["c1", "c2"], total: 2 },
      PAGE: { ids: ["p1"], total: 1 },
    });

    const result = await search("sakya");

    expect(result.groups.map((group) => group.id)).toEqual(["c1", "c2", "p1"]);
    expect(result.total).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it("has more while either kind has a further page", async () => {
    listing({
      COMMUNITY: { ids: [], total: 3 },
      PAGE: { ids: ["p11"], total: 25 },
    });

    expect((await search("sakya", 10)).hasMore).toBe(true);
    expect((await search("sakya", 20)).hasMore).toBe(false);
  });

  it("drops a leading @ so a handle can be searched as shown", async () => {
    listing({});

    await search("@sakya");

    expect(getMock.mock.calls[0][1].params.search).toBe("sakya");
  });
});
