import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupDetailDTO } from "./types.ts";

vi.mock("@tolgee/react", () => ({
  useTolgee: () => ({ getLanguage: () => "en" }),
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

// The shared setup stubs react-query out; this page is tested against the
// real cache, since moving to the @slug address without a refetch is its job.
vi.mock("react-query", async () => vi.importActual("react-query"));

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

const api = {
  resolveGroupId: vi.fn(),
  fetchGroupDetail: vi.fn(),
  fetchGroupPractices: vi.fn(),
  fetchGroupEvents: vi.fn(),
  fetchGroupPostsPage: vi.fn(),
};
vi.mock("./api/groupsApi.ts", async () => {
  const actual =
    await vi.importActual<typeof import("./api/groupsApi.ts")>(
      "./api/groupsApi.ts",
    );
  return {
    GroupNotFoundError: actual.GroupNotFoundError,
    resolveGroupId: (...args: unknown[]) => api.resolveGroupId(...args),
    fetchGroupDetail: (...args: unknown[]) => api.fetchGroupDetail(...args),
    fetchGroupPractices: (...args: unknown[]) =>
      api.fetchGroupPractices(...args),
    fetchGroupEvents: (...args: unknown[]) => api.fetchGroupEvents(...args),
    fetchGroupPostsPage: (...args: unknown[]) =>
      api.fetchGroupPostsPage(...args),
  };
});

const fetchGroupMembersPageMock = vi.fn();
vi.mock("../mantras/api/accumulatorApi.ts", () => ({
  MEMBERS_PAGE_SIZE: 20,
  fetchGroupMembersPage: (...args: unknown[]) =>
    fetchGroupMembersPageMock(...args),
}));

import { GroupNotFoundError } from "./api/groupsApi.ts";
import GroupPage from "./GroupPage.tsx";

const GROUP_ID = "589bd8ab-d3db-4d42-a61a-9a34841daf49";

const group = (overrides: Partial<GroupDetailDTO> = {}): GroupDetailDTO => ({
  id: GROUP_ID,
  slug: "dzongsar",
  group_type: "COMMUNITY",
  is_public: true,
  avatar_url: "https://cdn.example/avatar.webp",
  banner_url: "https://cdn.example/banner.webp",
  metadata: {
    id: "m1",
    title: "Dzongsar Khyentse Chokyi Lodro Institute",
    sub_title: "Dzongsar Shedra",
    description: "A living Tibetan Buddhist shedra.",
    description_long: "## Roots in Old Tibet\n\nFounded in 1871.",
    language: "EN",
  },
  tags: ["Shedra"],
  social_links: [
    { id: "s1", platform: "youtube", url: "https://youtube.com/@dzongsar" },
    { id: "s2", platform: "fax", url: "javascript:alert(1)" },
  ],
  follower_count: 4,
  joiner_count: 1110,
  member_count: 2,
  ...overrides,
});

const Address = () => <p data-testid="address">{useLocation().pathname}</p>;

const renderAt = (path: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/group/:handle"
            element={
              <>
                <GroupPage />
                <Address />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("GroupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.resolveGroupId.mockResolvedValue(GROUP_ID);
    api.fetchGroupDetail.mockResolvedValue(group());
    api.fetchGroupPractices.mockResolvedValue({
      practices: [
        {
          type: "series",
          series: {
            id: "series-1",
            metadata: { title: "Tara's Profound Essence" },
            total_days: 21,
          },
        },
        {
          type: "accumulator",
          accumulator: {
            id: "acc-1",
            group_id: GROUP_ID,
            title: "Mani for long life",
            member_count: 58,
            target_count: 10000000,
            created_at: "2026-07-01T00:00:00Z",
          },
        },
      ],
      total: 2,
      skip: 0,
      limit: 50,
    });
    api.fetchGroupEvents.mockResolvedValue({
      events: [
        {
          id: "event-1",
          group_id: GROUP_ID,
          start_date: "2026-09-25T02:30:00Z",
          end_date: "2026-10-15T11:30:00Z",
          is_one_day: false,
          featured: true,
          metadata: { id: "e1", name: "21-Day Tara Puja", language: "en" },
        },
      ],
      total: 1,
      skip: 0,
      limit: 50,
    });
    api.fetchGroupPostsPage.mockResolvedValue({
      posts: [
        {
          id: "post-1",
          caption: "Glimpse from 100000 Tara Puja",
          created_at: "2026-10-01T10:15:49Z",
          media: [],
          like_count: 10,
          comment_count: 6,
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    });
    fetchGroupMembersPageMock.mockResolvedValue({
      items: [{ fullname: "Gyaltsen Dhargyal", username: "tigerboy" }],
      total: 1110,
    });
  });

  it("shows everything about the group at its @slug address", async () => {
    renderAt("/group/@dzongsar");

    expect(
      await screen.findByRole("heading", {
        name: "Dzongsar Khyentse Chokyi Lodro Institute",
      }),
    ).toBeInTheDocument();
    expect(api.resolveGroupId).toHaveBeenCalledWith({ slug: "dzongsar" });
    expect(api.fetchGroupDetail).toHaveBeenCalledWith(GROUP_ID, "en");

    expect(screen.getByText("Dzongsar Shedra")).toBeInTheDocument();
    expect(
      screen.getByText("A living Tibetan Buddhist shedra."),
    ).toBeInTheDocument();
    // The loaded member's face, then everyone else as a number, leading to
    // the full list.
    expect(
      await screen.findByText('group_page.members_more:{"count":"1,109"}'),
    ).toBeInTheDocument();
    expect(
      screen
        .getByText('group_page.members_more:{"count":"1,109"}')
        .closest("a"),
    ).toHaveAttribute("href", "#group-members");
    // Neither the follower count nor a "community" label is shown.
    expect(
      screen.queryByText(/group_page\.followers_count/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("group_page.type_community"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Shedra")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Roots in Old Tibet" }),
    ).toBeInTheDocument();

    // Only links a browser can safely follow are offered.
    expect(screen.getByRole("link", { name: "Youtube" })).toHaveAttribute(
      "href",
      "https://youtube.com/@dzongsar",
    );
    expect(screen.queryByRole("link", { name: "Fax" })).not.toBeInTheDocument();

    expect(await screen.findByText("21-Day Tara Puja")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Tara's Profound Essence/ }),
    ).toHaveAttribute("href", "/plans?series=series-1&view=list&lang=en");
    expect(
      screen.getByRole("link", { name: /Mani for long life/ }),
    ).toHaveAttribute(
      "href",
      `/plans?group=${GROUP_ID}&accumulator=acc-1&lang=en`,
    );
    expect(
      await screen.findByText("Glimpse from 100000 Tara Puja"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Gyaltsen Dhargyal")).toBeInTheDocument();
  });

  it("moves an id address to the @slug one without loading the group again", async () => {
    renderAt(`/group/${GROUP_ID}`);

    await waitFor(() =>
      expect(screen.getByTestId("address")).toHaveTextContent(
        "/group/@dzongsar",
      ),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Dzongsar Khyentse Chokyi Lodro Institute",
      }),
    ).toBeInTheDocument();
    expect(api.resolveGroupId).toHaveBeenCalledTimes(1);
    expect(api.resolveGroupId).toHaveBeenCalledWith({ id: GROUP_ID });
    expect(api.fetchGroupDetail).toHaveBeenCalledTimes(1);
  });

  it("keeps the id address for a private group, whose slug would not load again", async () => {
    api.fetchGroupDetail.mockResolvedValue(group({ is_public: false }));

    renderAt(`/group/${GROUP_ID}`);

    expect(
      await screen.findByRole("heading", {
        name: "Dzongsar Khyentse Chokyi Lodro Institute",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("address")).toHaveTextContent(
      `/group/${GROUP_ID}`,
    );
  });

  it("folds a long history, and opens it on request", async () => {
    api.fetchGroupDetail.mockResolvedValue(
      group({
        metadata: {
          id: "m1",
          title: "Dzongsar Khyentse Chokyi Lodro Institute",
          description_long: "The story of the shedra. ".repeat(80),
          language: "EN",
        },
      }),
    );

    renderAt("/group/@dzongsar");

    const toggle = await screen.findByRole("button", {
      name: "group_page.read_more",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "group_page.read_less" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("says when no group has the slug", async () => {
    api.resolveGroupId.mockRejectedValue(
      new GroupNotFoundError({ slug: "nobody" }),
    );

    renderAt("/group/@nobody");

    expect(await screen.findByText("group_page.not_found")).toBeInTheDocument();
  });

  it("tells a failed load apart from a missing group", async () => {
    api.fetchGroupDetail.mockRejectedValue(new Error("Network Error"));

    renderAt("/group/@dzongsar");

    // The page tries once more before giving up, a second later.
    expect(
      await screen.findByText("group_page.load_failed", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(api.fetchGroupDetail).toHaveBeenCalledTimes(2);
  });

  it("refuses an address that names no group", () => {
    renderAt("/group/dzongsar");

    expect(screen.getByText("group_page.not_found")).toBeInTheDocument();
    expect(api.resolveGroupId).not.toHaveBeenCalled();
  });
});
