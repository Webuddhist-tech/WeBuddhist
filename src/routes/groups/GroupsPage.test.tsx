import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorGroupSummaryDTO } from "../mantras/types.ts";
import type { GroupFeedItemDTO } from "./types.ts";

vi.mock("@tolgee/react", () => ({
  useTolgee: () => ({ getLanguage: () => "en" }),
  useTranslate: () => ({
    t: (key: string, fallback?: unknown, params?: Record<string, unknown>) => {
      const values = typeof fallback === "object" ? fallback : params;
      return values ? `${key}:${JSON.stringify(values)}` : key;
    },
  }),
}));

vi.mock("react-query", async () => vi.importActual("react-query"));

vi.mock("../commons/seo/Seo.tsx", () => ({ default: () => null }));

const fetchPublicGroupsMock = vi.fn();
vi.mock("../mantras/api/accumulatorApi.ts", () => ({
  fetchPublicGroups: (...args: unknown[]) => fetchPublicGroupsMock(...args),
}));

const fetchGroupActivityFeedMock = vi.fn();
vi.mock("./api/groupsApi.ts", () => ({
  fetchGroupActivityFeed: (...args: unknown[]) =>
    fetchGroupActivityFeedMock(...args),
}));

import GroupsPage from "./GroupsPage.tsx";

const group = (id: string, title: string): AuthorGroupSummaryDTO => ({
  id,
  slug: id,
  group_type: "COMMUNITY",
  is_public: true,
  metadata: { id: `${id}-m`, title, language: "EN" },
  tags: [],
  follower_count: 0,
  joiner_count: 3,
  member_count: 3,
});

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("GroupsPage", () => {
  beforeEach(() => {
    fetchPublicGroupsMock.mockReset();
    fetchGroupActivityFeedMock.mockReset();
  });

  it("sorts groups into bands by how active they are, linking each to its page", async () => {
    fetchPublicGroupsMock.mockResolvedValue({
      groups: [
        group("quiet", "Quiet Sangha"),
        group("posting", "Posting Sangha"),
        group("gathering", "Gathering Sangha"),
      ],
      total: 3,
      skip: 0,
      limit: 100,
    });
    const items: GroupFeedItemDTO[] = [
      {
        type: "post",
        feed_at: hoursFromNow(-5),
        group_id: "posting",
        post: { id: "p1", created_at: hoursFromNow(-5) },
      },
      {
        type: "event",
        feed_at: hoursFromNow(-1),
        group_id: "gathering",
        event: {
          id: "e1",
          group_id: "gathering",
          start_date: hoursFromNow(-1),
          end_date: hoursFromNow(1),
          is_one_day: true,
          featured: false,
          metadata: null,
        },
      },
    ];
    fetchGroupActivityFeedMock.mockResolvedValue({
      items,
      total: 2,
      skip: 0,
      limit: 100,
    });

    renderPage();

    const live = await screen.findByRole("region", {
      name: /groups_page.band_live/,
    });
    expect(within(live).getByText("Gathering Sangha")).toBeInTheDocument();
    expect(within(live).getByText("groups_page.live")).toBeInTheDocument();

    const active = screen.getByRole("region", {
      name: /groups_page.band_active/,
    });
    expect(
      within(active).getByRole("link", { name: /Posting Sangha/ }),
    ).toHaveAttribute("href", "/group/@posting");

    const quiet = screen.getByRole("region", {
      name: /groups_page.band_quiet/,
    });
    expect(within(quiet).getByText("Quiet Sangha")).toBeInTheDocument();
  });

  it("still lists the groups when the activity feed fails", async () => {
    fetchPublicGroupsMock.mockResolvedValue({
      groups: [group("a", "Alpha Sangha")],
      total: 1,
      skip: 0,
      limit: 100,
    });
    fetchGroupActivityFeedMock.mockRejectedValue(new Error("down"));

    renderPage();

    expect(await screen.findByText("Alpha Sangha")).toBeInTheDocument();
  });

  it("says so when the groups cannot be loaded", async () => {
    fetchPublicGroupsMock.mockRejectedValue(new Error("down"));
    fetchGroupActivityFeedMock.mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
    });

    renderPage();

    expect(
      await screen.findByText("groups_page.load_failed"),
    ).toBeInTheDocument();
  });
});
