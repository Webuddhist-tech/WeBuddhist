import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("react-query", async () => vi.importActual("react-query"));

const fetchGroupPostsPageMock = vi.fn();
vi.mock("../api/groupsApi.ts", () => ({
  fetchGroupPostsPage: (...args: unknown[]) => fetchGroupPostsPageMock(...args),
}));

import GroupPosts from "./GroupPosts.tsx";

const photo = (index: number) => ({
  id: `m${index}`,
  media_type: "IMAGE",
  url: `https://cdn.example/photo-${index}.webp`,
  display_order: index,
});

const renderPosts = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <GroupPosts
        groupId="g1"
        groupName="Dzongsar"
        avatarUrl={null}
        locale="en"
      />
    </QueryClientProvider>,
  );

const photoLinks = () =>
  screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.includes("/photo-"));

describe("GroupPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchGroupPostsPageMock.mockResolvedValue({
      posts: [
        {
          id: "post-1",
          caption: "Glimpse from 100000 Tara Puja",
          created_at: "2026-10-01T10:15:49Z",
          media: [1, 2, 3, 4, 5, 6].map(photo),
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    });
  });

  it("folds the photos past four behind a tile that opens them all", async () => {
    renderPosts();

    const more = await screen.findByRole("button", {
      name: 'group_page.show_all_media:{"count":6}',
    });
    expect(more).toHaveTextContent("+2");
    expect(photoLinks()).toHaveLength(3);

    fireEvent.click(more);

    expect(photoLinks()).toHaveLength(6);
    expect(photoLinks()[5]).toHaveAttribute(
      "href",
      "https://cdn.example/photo-6.webp",
    );
    expect(
      screen.queryByRole("button", { name: /show_all_media/ }),
    ).not.toBeInTheDocument();
  });
});
