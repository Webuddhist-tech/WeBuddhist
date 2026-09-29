import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const useLiveViewerCountMock = vi.fn();
vi.mock("../hooks/useLiveViewerCount.ts", () => ({
  useLiveViewerCount: (eventId: string, enabled: boolean) =>
    useLiveViewerCountMock(eventId, enabled),
}));

import LiveViewerCount from "./LiveViewerCount.tsx";

describe("LiveViewerCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockState = (state: {
    count?: number | null;
    status: string;
    detail?: string | null;
    code?: string | null;
  }) =>
    useLiveViewerCountMock.mockReturnValue({
      count: null,
      detail: null,
      code: null,
      ...state,
    });

  it("shows the count and says this page is in it", () => {
    mockState({ count: 12, status: "connected" });

    render(<LiveViewerCount eventId="event-1" />);

    expect(screen.getByText(/live_events.watching_other/)).toBeInTheDocument();
    expect(screen.getByText("live_events.including_you")).toBeInTheDocument();
  });

  it("uses the singular wording for one person", () => {
    mockState({ count: 1, status: "connected" });

    render(<LiveViewerCount eventId="event-1" />);

    expect(screen.getByText("live_events.watching_one")).toBeInTheDocument();
  });

  it("asks a signed-out reader to sign in", () => {
    mockState({ status: "signed-out" });

    render(<LiveViewerCount eventId="event-1" />);

    expect(screen.getByText("live_events.sign_in_to_see")).toBeInTheDocument();
  });

  it("passes on the server's reason when following is refused", () => {
    // Following a recitation is limited to members of the event's group, and
    // that is something the reader can act on - so it is not flattened into a
    // generic failure.
    mockState({
      status: "refused",
      detail:
        "Only joined or following members of this event's group can follow its recitation",
    });

    render(<LiveViewerCount eventId="event-1" />);

    expect(screen.getByText(/joined or following members/)).toBeInTheDocument();
  });

  it("falls back to its own wording when the server gave no reason", () => {
    mockState({ status: "refused", detail: null });

    render(<LiveViewerCount eventId="event-1" />);

    expect(
      screen.getByText("live_events.count_unavailable"),
    ).toBeInTheDocument();
  });

  it("renders nothing at all when disabled", () => {
    mockState({ status: "connecting" });

    const { container } = render(
      <LiveViewerCount eventId="event-1" enabled={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
