import { vi, describe, beforeEach, test, expect, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "react-query";
import "@testing-library/jest-dom";
import EditionAudioPlayer from "./EditionAudioPlayer.tsx";
import { fetchEditionRecordings } from "@/services/library";

vi.mock("react-query", async () => await vi.importActual("react-query"));

vi.mock("@/services/library", async () => {
  const actual =
    await vi.importActual<typeof import("@/services/library")>(
      "@/services/library",
    );
  return {
    ...actual,
    fetchEditionRecordings: vi.fn(),
  };
});

const mockedFetch = fetchEditionRecordings as Mock;

const recording = (overrides: Record<string, unknown> = {}) => ({
  id: "rec-1",
  edition_id: "ed-1",
  text_id: "t-1",
  format: "mp3",
  duration_ms: 141672,
  ...overrides,
});

const renderPlayer = (editionId = "ed-1") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditionAudioPlayer editionId={editionId} />
    </QueryClientProvider>,
  );
};

describe("EditionAudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn(function play(
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    });
    HTMLMediaElement.prototype.pause = vi.fn(function pause(
      this: HTMLMediaElement,
    ) {
      this.dispatchEvent(new Event("pause"));
    });
  });

  test("renders nothing when there are no recordings", async () => {
    mockedFetch.mockResolvedValue([]);
    const { container } = renderPlayer();
    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Play" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("audio")).not.toBeInTheDocument();
  });

  test("plays and pauses a single recording", async () => {
    mockedFetch.mockResolvedValue([recording()]);
    const user = userEvent.setup();
    renderPlayer();

    const playButton = await screen.findByRole("button", { name: "Play" });
    expect(
      screen.queryByRole("button", { name: "Choose recording" }),
    ).not.toBeInTheDocument();

    const audio = document.querySelector("audio") as HTMLAudioElement;
    expect(audio.src).toContain("/library/v2/recordings/rec-1/audio");

    await user.click(playButton);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "Pause" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(
      await screen.findByRole("button", { name: "Play" }),
    ).toBeInTheDocument();
  });

  test("lets the user pick among multiple recordings", async () => {
    mockedFetch.mockResolvedValue([
      recording({
        id: "rec-1",
        contributions: [
          { role: "narrator", name: { bo: "མཁན་ཆེན་བསྟན་པ་རབ་རྒྱས།" } },
        ],
      }),
      recording({
        id: "rec-2",
        title: { en: "Second reading" },
        duration_ms: 90000,
      }),
    ]);
    const user = userEvent.setup();
    renderPlayer();

    await screen.findByRole("button", { name: "Play" });
    await user.click(screen.getByRole("button", { name: "Choose recording" }));

    expect(
      await screen.findByText("མཁན་ཆེན་བསྟན་པ་རབ་རྒྱས།"),
    ).toBeInTheDocument();
    expect(screen.getByText("Second reading")).toBeInTheDocument();
    expect(screen.getByText("2:21")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();

    await user.click(screen.getByText("Second reading"));
    await waitFor(() => {
      const audio = document.querySelector("audio") as HTMLAudioElement;
      expect(audio.src).toContain("/library/v2/recordings/rec-2/audio");
    });
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
