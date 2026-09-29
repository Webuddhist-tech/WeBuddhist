import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as reactQuery from "react-query";
import { mockReactQuery } from "../../test-utils/CommonMocks.ts";
import type { EventDTO } from "./types.ts";

mockReactQuery();

vi.mock("@tolgee/react", () => ({
  useTolgee: () => ({ getLanguage: () => "en" }),
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const useLiveViewerCountMock = vi.fn();
vi.mock("./hooks/useLiveViewerCount.ts", () => ({
  useLiveViewerCount: (eventId: string, enabled: boolean) =>
    useLiveViewerCountMock(eventId, enabled),
}));

import LiveEventDetail from "./LiveEventDetail.tsx";

const event = (overrides: Partial<EventDTO> = {}): EventDTO => ({
  id: "event-1",
  group_id: "group-1",
  start_date: "2026-03-10T10:00:00Z",
  end_date: "2026-03-10T12:00:00Z",
  is_one_day: true,
  featured: true,
  metadata: {
    id: "m1",
    name: "Morning Puja",
    description: "A daily gathering.",
    language: "en",
  },
  ...overrides,
});

const mockQuery = (value: Partial<ReturnType<typeof reactQuery.useQuery>>) => {
  vi.mocked(reactQuery.useQuery).mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    ...value,
  } as ReturnType<typeof reactQuery.useQuery>);
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/live/event-1"]}>
      <Routes>
        <Route path="/live/:eventId" element={<LiveEventDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("LiveEventDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLiveViewerCountMock.mockReturnValue({
      count: 12,
      status: "connected",
      detail: null,
      code: null,
    });
    vi.setSystemTime(new Date("2026-03-10T11:00:00Z"));
  });

  it("shows the event's details", () => {
    mockQuery({
      data: event({ group_name: "Sera Monastery", timezone: "Asia/Kolkata" }),
    });

    renderPage();

    expect(
      screen.getByRole("heading", { name: "Morning Puja" }),
    ).toBeInTheDocument();
    expect(screen.getByText("A daily gathering.")).toBeInTheDocument();
    expect(screen.getByText("Sera Monastery")).toBeInTheDocument();
    expect(screen.getByText("Asia/Kolkata")).toBeInTheDocument();
  });

  it("renders markdown in the description", () => {
    mockQuery({
      data: event({
        metadata: {
          id: "m1",
          name: "Morning Puja",
          description: "**Bold lead**\n\n- First item\n- Second item",
          language: "en",
        },
      }),
    });

    renderPage();

    const bold = screen.getByText("Bold lead");
    expect(bold.tagName).toBe("STRONG");
    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("opens safe links from markdown in a new tab", () => {
    mockQuery({
      data: event({
        metadata: {
          id: "m1",
          name: "Morning Puja",
          description: "Join us at [our site](https://example.com/puja).",
          language: "en",
        },
      }),
    });

    renderPage();

    const link = screen.getByRole("link", { name: "our site" });
    expect(link).toHaveAttribute("href", "https://example.com/puja");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("embeds the stream for the reader's language", () => {
    mockQuery({
      data: event({
        youtube: [
          {
            id: "v-bo",
            url: "https://youtu.be/bbbbbbbbbbb",
            language: "bo",
            display_order: 1,
          },
          {
            id: "v-en",
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            language: "en",
            display_order: 2,
          },
        ],
      }),
    });

    renderPage();

    const frame = screen.getByTitle("live_events.watch_stream");
    expect(frame).toHaveAttribute(
      "src",
      expect.stringContaining(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      ),
    );
    // Live, so it starts itself - muted, since browsers block audible autoplay.
    expect(frame.getAttribute("src")).toContain("autoplay=1");
    expect(frame.getAttribute("src")).toContain("mute=1");
  });

  it("offers a plain link when the video is not a YouTube URL", () => {
    mockQuery({
      data: event({
        youtube: [
          {
            id: "v1",
            url: "https://vimeo.com/123456",
            label: "Watch on Vimeo",
            language: "en",
            display_order: 1,
          },
        ],
      }),
    });

    renderPage();

    expect(
      screen.getByRole("link", { name: "Watch on Vimeo" }),
    ).toHaveAttribute("href", "https://vimeo.com/123456");
    expect(screen.queryByTitle("Watch on Vimeo")).not.toBeInTheDocument();
  });

  it("joins the socket only while the event is running", () => {
    mockQuery({ data: event() });
    renderPage();
    expect(useLiveViewerCountMock).toHaveBeenCalledWith("event-1", true);

    vi.clearAllMocks();
    useLiveViewerCountMock.mockReturnValue({
      count: null,
      status: "connecting",
      detail: null,
      code: null,
    });
    mockQuery({
      data: event({
        start_date: "2026-04-10T10:00:00Z",
        end_date: "2026-04-10T12:00:00Z",
      }),
    });

    renderPage();

    expect(useLiveViewerCountMock).toHaveBeenCalledWith("event-1", false);
  });

  it("marks a running event live and a finished one ended", () => {
    mockQuery({ data: event() });
    renderPage();
    expect(screen.getByText("live_events.live_now")).toBeInTheDocument();

    vi.clearAllMocks();
    useLiveViewerCountMock.mockReturnValue({
      count: null,
      status: "connecting",
      detail: null,
      code: null,
    });
    mockQuery({
      data: event({
        start_date: "2026-03-01T10:00:00Z",
        end_date: "2026-03-01T12:00:00Z",
      }),
    });

    renderPage();

    expect(screen.getByText("live_events.ended")).toBeInTheDocument();
  });

  it("says so when the event cannot be loaded", () => {
    mockQuery({ error: new Error("gone") });

    renderPage();

    expect(screen.getByText("live_events.detail_failed")).toBeInTheDocument();
  });
});
