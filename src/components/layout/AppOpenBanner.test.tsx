import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AppOpenBanner from "./AppOpenBanner";
import {
  DISMISS_KEY,
  DISMISS_TIME_INTERVAL_MS,
  PLAY_STORE_URL,
  APP_STORE_URL,
} from "../../utils/constants";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback,
  }),
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, "userAgent", {
    value: userAgent,
    writable: true,
    configurable: true,
  });
};

const getDownloadLink = () =>
  screen.getByRole("link", { name: "Open mobile app store link" });

const renderBanner = (initialEntry = "/") =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppOpenBanner />
    </MemoryRouter>,
  );

describe("AppOpenBanner Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test("does not render when redirected=true query param is present", () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner("/?redirected=true");

    expect(screen.queryByText("Get our Mobile App")).not.toBeInTheDocument();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      DISMISS_KEY,
      expect.any(String),
    );
  });

  test("does not render on desktop devices", () => {
    mockUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );

    renderBanner();

    expect(screen.queryByText("Get our Mobile App")).not.toBeInTheDocument();
  });

  test("renders on Android devices", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText("Get our Mobile App")).toBeInTheDocument();
      expect(
        screen.getByText(/The mind is everything. What you think you become./),
      ).toBeInTheDocument();
      expect(screen.getByAltText("QR code to download WeBuddhist")).toHaveAttribute(
        "src",
        "/img/QR-download.png",
      );
      expect(getDownloadLink()).toHaveAttribute("href", PLAY_STORE_URL);
    });
  });

  test("renders on iOS devices with App Store link", async () => {
    mockUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText("Get our Mobile App")).toBeInTheDocument();
      expect(getDownloadLink()).toHaveAttribute("href", APP_STORE_URL);
    });
  });

  test("does not render if recently dismissed", () => {
    const recentDismissTime = Date.now() - DISMISS_TIME_INTERVAL_MS / 2;
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );
    localStorageMock.getItem.mockReturnValue(recentDismissTime.toString());

    renderBanner();

    expect(screen.queryByText("Get our Mobile App")).not.toBeInTheDocument();
  });

  test("renders if dismiss time has expired", async () => {
    const oldDismissTime = Date.now() - (DISMISS_TIME_INTERVAL_MS + 1000);
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );
    localStorageMock.getItem.mockReturnValue(oldDismissTime.toString());

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText("Get our Mobile App")).toBeInTheDocument();
    });
  });

  test("dismisses banner when close button is clicked", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner();

    await waitFor(() => {
      expect(screen.getByText("Get our Mobile App")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      DISMISS_KEY,
      expect.any(String),
    );
    expect(screen.queryByText("Get our Mobile App")).not.toBeInTheDocument();
  });

  test("detects iPad as Apple device", async () => {
    mockUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    );

    renderBanner();

    await waitFor(() => {
      expect(getDownloadLink()).toHaveAttribute("href", APP_STORE_URL);
    });
  });

  test("opens store link when Enter is pressed on download link", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner();

    await waitFor(() => {
      expect(getDownloadLink()).toBeInTheDocument();
    });

    const downloadLink = getDownloadLink();
    const clickSpy = vi.spyOn(downloadLink, "click");

    fireEvent.keyDown(downloadLink, { key: "Enter" });

    expect(clickSpy).toHaveBeenCalled();
  });

  test("opens store link when Space is pressed on download link", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner();

    await waitFor(() => {
      expect(getDownloadLink()).toBeInTheDocument();
    });

    const downloadLink = getDownloadLink();
    const clickSpy = vi.spyOn(downloadLink, "click");

    fireEvent.keyDown(downloadLink, { key: " " });

    expect(clickSpy).toHaveBeenCalled();
  });

  test("has correct accessibility attributes", async () => {
    mockUserAgent(
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0",
    );

    renderBanner();

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
      expect(screen.getByLabelText("inspirational quote")).toBeInTheDocument();
    });
  });
});
