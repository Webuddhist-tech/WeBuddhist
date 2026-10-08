import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

// The recitation view loads its own text; it has tests of its own. The page's
// buttons and the stream it hands the view are drawn, so they can be used.
const liveRecitationViewMock = vi.fn();
vi.mock("./components/LiveRecitationView.tsx", () => ({
  default: (props: { actions?: ReactNode; aside?: ReactNode }) => {
    liveRecitationViewMock(props);
    return (
      <div data-testid="live-recitation">
        {props.actions}
        {props.aside}
      </div>
    );
  },
}));

import LiveRecitationPage from "./LiveRecitationPage.tsx";

const event = (overrides: Partial<EventDTO> = {}): EventDTO => ({
  id: "event-1",
  group_id: "group-1",
  start_date: "2026-03-10T10:00:00Z",
  end_date: "2026-03-10T12:00:00Z",
  is_one_day: true,
  featured: true,
  metadata: { id: "m1", name: "Tara Puja", language: "en" },
  youtube: [
    {
      id: "y1",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      language: "en",
      display_order: 0,
    },
  ],
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
    <MemoryRouter initialEntries={["/live/event-1/recitation"]}>
      <Routes>
        <Route
          path="/live/:eventId/recitation"
          element={<LiveRecitationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const connected = {
  count: 12,
  status: "connected",
  detail: null,
  code: null,
  position: null,
  sessionEnded: false,
};

describe("LiveRecitationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLiveViewerCountMock.mockReturnValue(connected);
    vi.setSystemTime(new Date("2026-03-10T11:00:00Z"));
  });

  it("follows the recitation on the event's socket while it is live", () => {
    mockQuery({
      data: event({ group_recitation_collection_id: "collection-1" }),
    });

    renderPage();

    expect(useLiveViewerCountMock).toHaveBeenLastCalledWith("event-1", true);
    expect(liveRecitationViewMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        live: expect.objectContaining({ count: 12, status: "connected" }),
        language: "en",
        collectionId: "collection-1",
        theme: "dark",
        title: "Tara Puja",
        backTo: "/live/event-1",
      }),
    );
  });

  it("keeps the stream hidden until asked for, then puts it away again", () => {
    mockQuery({ data: event() });

    renderPage();

    expect(
      screen.queryByTitle("live_events.watch_stream"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.show_stream" }),
    );

    expect(screen.getByTitle("live_events.watch_stream")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "live_events.hide_stream" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "live_events.hide_stream" }),
    );

    expect(
      screen.queryByTitle("live_events.watch_stream"),
    ).not.toBeInTheDocument();
  });

  it("stays off the socket until the event begins", () => {
    mockQuery({
      data: event({
        start_date: "2026-04-10T10:00:00Z",
        end_date: "2026-04-10T12:00:00Z",
      }),
    });

    renderPage();

    expect(useLiveViewerCountMock).toHaveBeenLastCalledWith("event-1", false);
    expect(screen.queryByTestId("live-recitation")).not.toBeInTheDocument();
    expect(
      screen.getByText("live_events.recitation_not_live"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tara Puja" }),
    ).toBeInTheDocument();
    // The mark in the bar leads back to the event, as does the line below.
    for (const link of screen.getAllByRole("link", {
      name: /live_events.back_to_event/,
    })) {
      expect(link).toHaveAttribute("href", "/live/event-1");
    }
  });

  it("says when the event is over", () => {
    mockQuery({
      data: event({
        start_date: "2026-03-01T10:00:00Z",
        end_date: "2026-03-01T12:00:00Z",
      }),
    });

    renderPage();

    expect(screen.getByText("live_events.recitation_over")).toBeInTheDocument();
    expect(screen.queryByTestId("live-recitation")).not.toBeInTheDocument();
  });

  it("sets the page on paper when the reader picks light, and remembers it", () => {
    mockQuery({ data: event() });
    const { unmount } = renderPage();
    expect(screen.getByRole("main")).toHaveStyle({ colorScheme: "dark" });

    const { onThemeChange } = liveRecitationViewMock.mock.lastCall?.[0] as {
      onThemeChange: (theme: string) => void;
    };
    act(() => onThemeChange("light"));

    expect(screen.getByRole("main")).toHaveStyle({ colorScheme: "light" });
    unmount();

    renderPage();
    expect(liveRecitationViewMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ theme: "light" }),
    );
    localStorage.clear();
  });

  it("says so when the event cannot be loaded", () => {
    mockQuery({ error: new Error("gone") });

    renderPage();

    expect(screen.getByText("live_events.detail_failed")).toBeInTheDocument();
  });
});
