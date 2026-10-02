import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import type { LiveViewerCount as LiveViewerCountState } from "../hooks/useLiveViewerCount.ts";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

import LiveViewerCount from "./LiveViewerCount.tsx";

describe("LiveViewerCount", () => {
  const liveState = (
    state: Partial<LiveViewerCountState> & Pick<LiveViewerCountState, "status">,
  ): LiveViewerCountState => ({
    count: null,
    detail: null,
    code: null,
    position: null,
    sessionEnded: false,
    ...state,
  });

  it("shows the count and says this page is in it", () => {
    const live = liveState({ count: 12, status: "connected" });

    render(<LiveViewerCount live={live} />);

    expect(screen.getByText(/live_events.watching_other/)).toBeInTheDocument();
    expect(screen.getByText("live_events.including_you")).toBeInTheDocument();
  });

  it("uses the singular wording for one person", () => {
    const live = liveState({ count: 1, status: "connected" });

    render(<LiveViewerCount live={live} />);

    expect(screen.getByText("live_events.watching_one")).toBeInTheDocument();
  });

  it("passes on the server's reason when following is refused", () => {
    // The server knows why - an event gone, or not yet published - so that is
    // not flattened into a generic failure.
    const live = liveState({ status: "refused", detail: "Event not found" });

    render(<LiveViewerCount live={live} />);

    expect(screen.getByText("Event not found")).toBeInTheDocument();
  });

  it("falls back to its own wording when the server gave no reason", () => {
    const live = liveState({ status: "refused", detail: null });

    render(<LiveViewerCount live={live} />);

    expect(
      screen.getByText("live_events.count_unavailable"),
    ).toBeInTheDocument();
  });

  it("renders nothing at all when disabled", () => {
    const live = liveState({ status: "connecting" });

    const { container } = render(
      <LiveViewerCount live={live} enabled={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
