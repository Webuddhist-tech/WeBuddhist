import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { APP_STORE_URL } from "../../utils/constants.ts";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

import OpenApp from "./OpenApp.tsx";

const replace = vi.fn();
const originalLocation = window.location;
const originalUserAgent = navigator.userAgent;

const setUserAgent = (value: string) =>
  Object.defineProperty(navigator, "userAgent", { value, configurable: true });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/open" element={<OpenApp />} />
        <Route path="/open/*" element={<OpenApp />} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  replace.mockReset();
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, replace },
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    configurable: true,
  });
  setUserAgent(originalUserAgent);
});

describe("OpenApp", () => {
  test("sends an iPhone without the app to the App Store, not the home page", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    renderAt("/open");

    expect(replace).toHaveBeenCalledWith(APP_STORE_URL);
    expect(screen.queryByText("home page")).not.toBeInTheDocument();
  });

  test("keeps a deep link's path in the Android intent", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile");

    renderAt("/open/plan/123");

    expect(replace).toHaveBeenCalledWith(
      expect.stringMatching(/^intent:\/\/webuddhist\.com\/open\/plan\/123#/),
    );
  });

  test("shows a computer the QR code and both stores instead", () => {
    setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126");

    renderAt("/open");

    expect(replace).not.toHaveBeenCalled();
    expect(
      screen.getByAltText("QR code to download WeBuddhist"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /App Store/ })).toHaveAttribute(
      "href",
      APP_STORE_URL,
    );
    expect(
      screen.getByRole("link", { name: /Google Play/ }),
    ).toBeInTheDocument();
  });
});
