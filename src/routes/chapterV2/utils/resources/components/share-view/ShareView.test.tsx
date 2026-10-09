import type { ComponentProps } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import * as reactQuery from "react-query";
import { fireEvent, render, screen, act } from "@testing-library/react";
import ShareView, { fetchShortUrl } from "./ShareView";
import "@testing-library/jest-dom";
import axiosInstance from "../../../../../../config/axios-config";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../../../../../../config/axios-config", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockWriteText = vi.fn();
Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  configurable: true,
});

describe("ShareView Component", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockProps = {
    setIsShareView: vi.fn(),
    segmentId: "test-segment-123",
    handleNavigate: vi.fn(),
  };

  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();

    Object.defineProperty(window, "location", {
      value: new URL("https://example.com/text/123?segment_id=old-segment"),
      writable: true,
      configurable: true,
    });

    vi.spyOn(reactQuery, "useQuery").mockImplementation(
      () =>
        ({
          data: {
            shortUrl: "https://gg.com/share/123",
          },
          isLoading: false,
        }) as any,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  const setup = (props: ComponentProps<typeof ShareView> = mockProps) => {
    return render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <ShareView {...props} />
        </QueryClientProvider>
      </Router>,
    );
  };

  describe("Rendering", () => {
    it("renders ShareView component with header", () => {
      setup();
      expect(screen.getByText("common.share")).toBeInTheDocument();
    });

    it("displays the share link section title", () => {
      setup();
      expect(screen.getByText("text.share_link")).toBeInTheDocument();
    });

    it("displays the more options section title", () => {
      setup();
      expect(screen.getByText("text.more_options")).toBeInTheDocument();
    });

    it("displays the correct share URL from API", () => {
      setup();
      expect(screen.getByText("https://gg.com/share/123")).toBeInTheDocument();
    });

    it("displays loading state when fetching URL", () => {
      vi.spyOn(reactQuery, "useQuery").mockImplementation(
        () =>
          ({
            data: null,
            isLoading: true,
          }) as any,
      );

      setup();
      expect(screen.getByText("common.loading")).toBeInTheDocument();
    });

    it("falls back to constructed URL when shortUrl is not available", () => {
      vi.spyOn(reactQuery, "useQuery").mockImplementation(
        () =>
          ({
            data: null,
            isLoading: false,
          }) as any,
      );

      setup();
      expect(
        screen.getByText(
          "https://example.com/text/123?segment_id=test-segment-123",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Embed", () => {
    const readerUrl =
      "https://example.com/reader/text-1?segment_id=test-segment-123";

    it("hides the embed section when the text id is unknown", () => {
      setup();
      expect(screen.queryByText("text.embed")).not.toBeInTheDocument();
    });

    it("shows the reader link and iframe code for the text", () => {
      setup({ ...mockProps, textId: "text-1" });
      expect(screen.getByText("text.embed")).toBeInTheDocument();
      expect(screen.getByText(readerUrl)).toBeInTheDocument();
      expect(
        screen.getByText((text) =>
          text.startsWith(`<iframe src="${readerUrl}"`),
        ),
      ).toBeInTheDocument();
    });

    it("copies the reader link", () => {
      setup({ ...mockProps, textId: "text-1" });
      fireEvent.click(screen.getByLabelText("Copy reader link"));
      expect(mockWriteText).toHaveBeenCalledWith(readerUrl);
      expect(screen.getByLabelText("Copied reader link")).toBeInTheDocument();
    });

    it("copies the embed code", () => {
      setup({ ...mockProps, textId: "text-1" });
      fireEvent.click(screen.getByLabelText("Copy embed code"));
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining(`<iframe src="${readerUrl}"`),
      );
    });
  });

  describe("Close and Navigation", () => {
    it("handles close button click", () => {
      const { container } = setup();

      const buttons = container.querySelectorAll("button");
      const closeButton = buttons[1];
      fireEvent.click(closeButton);

      expect(mockProps.setIsShareView).toHaveBeenCalledWith("main");
    });

    it("handles back button click", () => {
      setup();

      const backButton = screen.getAllByRole("button")[0];
      fireEvent.click(backButton);

      expect(mockProps.handleNavigate).toHaveBeenCalled();
    });
  });

  describe("Copy Functionality", () => {
    it("copies URL to clipboard when copy button is clicked", () => {
      setup();

      const copyButton = screen.getByRole("button", {
        name: "Copy share link",
      });
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith("https://gg.com/share/123");
    });

    it("shows checkmark icon after copying", async () => {
      setup();

      const copyButton = screen.getByRole("button", {
        name: "Copy share link",
      });
      fireEvent.click(copyButton);

      expect(
        screen.getByRole("button", { name: "Copied link" }),
      ).toBeInTheDocument();
    });

    it("reverts to copy icon after 3 seconds", async () => {
      setup();

      const copyButton = screen.getByRole("button", {
        name: "Copy share link",
      });
      fireEvent.click(copyButton);

      expect(
        screen.getByRole("button", { name: "Copied link" }),
      ).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(
        screen.getByRole("button", { name: "Copy share link" }),
      ).toBeInTheDocument();
    });

    it("does not copy when shareLink is falsy", () => {
      vi.spyOn(reactQuery, "useQuery").mockImplementation(
        () =>
          ({
            data: { shortUrl: null },
            isLoading: false,
          }) as any,
      );

      setup();

      const copyButton = screen.getByRole("button", {
        name: "Copy share link",
      });
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  describe("Social Share Buttons", () => {
    it("displays Facebook share button", () => {
      setup();
      expect(screen.getByText("common.share_on_fb")).toBeInTheDocument();
    });

    it("displays X/Twitter share button", () => {
      setup();
      expect(screen.getByText("common.share_on_x")).toBeInTheDocument();
    });

    it("Facebook button has correct share URL", () => {
      setup();
      const fbLink = screen.getByRole("link", { name: /share on facebook/i });
      expect(fbLink).toHaveAttribute(
        "href",
        expect.stringContaining("facebook.com/sharer/sharer.php"),
      );
      expect(fbLink).toHaveAttribute(
        "href",
        expect.stringContaining(encodeURIComponent("https://gg.com/share/123")),
      );
    });

    it("X/Twitter button has correct share URL", () => {
      setup();
      const xLink = screen.getByRole("link", { name: /share on x/i });
      expect(xLink).toHaveAttribute(
        "href",
        expect.stringContaining("twitter.com/intent/tweet"),
      );
      expect(xLink).toHaveAttribute(
        "href",
        expect.stringContaining(encodeURIComponent("https://gg.com/share/123")),
      );
    });

    it("social share links open in new tab", () => {
      setup();
      const fbLink = screen.getByRole("link", { name: /share on facebook/i });
      const xLink = screen.getByRole("link", { name: /share on x/i });

      expect(fbLink).toHaveAttribute("target", "_blank");
      expect(fbLink).toHaveAttribute("rel", "noopener noreferrer");
      expect(xLink).toHaveAttribute("target", "_blank");
      expect(xLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});

describe("fetchShortUrl", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls API with correct parameters", async () => {
    const mockResponse = { data: { shortUrl: "https://short.url/abc" } };
    vi.mocked(axiosInstance.post).mockResolvedValue(mockResponse);

    const result = await fetchShortUrl(
      "https://example.com/text/123",
      "segment-456",
    );

    expect(axiosInstance.post).toHaveBeenCalledWith("/api/v1/share", {
      segment_id: "segment-456",
      language: "bo",
      url: "https://example.com/text/123",
    });
    expect(result).toEqual({ shortUrl: "https://short.url/abc" });
  });

  it("handles API errors", async () => {
    vi.mocked(axiosInstance.post).mockRejectedValue(new Error("API Error"));

    await expect(
      fetchShortUrl("https://example.com/text/123", "segment-456"),
    ).rejects.toThrow("API Error");
  });
});
