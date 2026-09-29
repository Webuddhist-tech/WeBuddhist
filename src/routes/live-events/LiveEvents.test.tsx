import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
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

import LiveEvents from "./LiveEvents.tsx";

const event = (overrides: Partial<EventDTO> = {}): EventDTO => ({
  id: "event-1",
  group_id: "group-1",
  start_date: "2026-03-10T10:00:00Z",
  end_date: "2026-03-10T12:00:00Z",
  is_one_day: true,
  featured: true,
  metadata: { id: "m1", name: "Morning Puja", language: "en" },
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <LiveEvents />
    </MemoryRouter>,
  );

const mockQuery = (value: Partial<ReturnType<typeof reactQuery.useQuery>>) => {
  vi.mocked(reactQuery.useQuery).mockReturnValue({
    data: undefined,
    error: null,
    isLoading: false,
    ...value,
  } as ReturnType<typeof reactQuery.useQuery>);
};

describe("LiveEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mid-way through the 10:00-12:00 event above.
    vi.setSystemTime(new Date("2026-03-10T11:00:00Z"));
  });

  it("groups events into live, upcoming and ended bands", () => {
    mockQuery({
      data: [
        event({ id: "live-1" }),
        event({
          id: "upcoming-1",
          start_date: "2026-03-20T10:00:00Z",
          end_date: "2026-03-20T12:00:00Z",
          metadata: { id: "m2", name: "Losar Ceremony", language: "en" },
        }),
        event({
          id: "past-1",
          start_date: "2026-03-01T10:00:00Z",
          end_date: "2026-03-01T12:00:00Z",
          metadata: { id: "m3", name: "Last Month's Puja", language: "en" },
        }),
      ],
    });

    renderPage();

    expect(screen.getByText("live_events.band_live")).toBeInTheDocument();
    expect(screen.getByText("live_events.band_upcoming")).toBeInTheDocument();
    expect(screen.getByText("live_events.band_past")).toBeInTheDocument();
    expect(screen.getByText("Morning Puja")).toBeInTheDocument();
    expect(screen.getByText("Losar Ceremony")).toBeInTheDocument();
  });

  it("omits a band that has no events", () => {
    mockQuery({ data: [event({ id: "live-1" })] });

    renderPage();

    expect(screen.getByText("live_events.band_live")).toBeInTheDocument();
    expect(
      screen.queryByText("live_events.band_upcoming"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("live_events.band_past")).not.toBeInTheDocument();
  });

  it("marks a running event as live and links to its detail page", () => {
    mockQuery({ data: [event({ id: "live-1" })] });

    renderPage();

    expect(screen.getByText("live_events.live_now")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Morning Puja/ })).toHaveAttribute(
      "href",
      "/live/live-1",
    );
  });

  it("shows a plain-text excerpt on the card when a description exists", () => {
    mockQuery({
      data: [
        event({
          id: "live-1",
          metadata: {
            id: "m1",
            name: "Morning Puja",
            description: "**Bold lead** about the gathering.",
            language: "en",
          },
        }),
      ],
    });

    renderPage();

    expect(
      screen.getByText("Bold lead about the gathering."),
    ).toBeInTheDocument();
  });

  it("shows an empty state rather than a bare page", () => {
    mockQuery({ data: [] });

    renderPage();

    expect(screen.getByText("live_events.empty_title")).toBeInTheDocument();
  });

  it("says so when the events cannot be loaded", () => {
    mockQuery({ error: new Error("boom") });

    renderPage();

    expect(screen.getByText("live_events.load_failed")).toBeInTheDocument();
    expect(
      screen.queryByText("live_events.empty_title"),
    ).not.toBeInTheDocument();
  });

  it("shows placeholders while loading, and no empty state", () => {
    mockQuery({ isLoading: true });

    renderPage();

    expect(
      screen.queryByText("live_events.empty_title"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("live_events.load_failed"),
    ).not.toBeInTheDocument();
  });
});
