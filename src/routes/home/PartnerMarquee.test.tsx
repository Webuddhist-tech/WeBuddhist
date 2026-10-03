import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";

// The shared test setup stubs react-query's useQuery; this uses a real one.
vi.mock("react-query", async () => await vi.importActual("react-query"));

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const fetchPublicGroups = vi.fn();
vi.mock("../mantras/api/accumulatorApi.ts", () => ({
  fetchPublicGroups: (...args: unknown[]) => fetchPublicGroups(...args),
}));

import PartnerMarquee from "./PartnerMarquee.tsx";

const groupsOf = (count: number) => ({
  total: count,
  groups: Array.from({ length: count }, (_, index) => ({
    id: `g-${index}`,
    metadata: [],
    avatar_url: `https://img.test/g${index}.png`,
  })),
});

const renderMarquee = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PartnerMarquee apiLanguage="en" language="EN" />
    </QueryClientProvider>,
  );

const originalMatchMedia = window.matchMedia;

/** Answers the reduced-motion query, leaving every other query unmatched. */
const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reduce : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  vi.clearAllMocks();
  setReducedMotion(false);
});

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("PartnerMarquee", () => {
  test("scrolls the partners past in a marquee", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(10));

    const { container } = renderMarquee();

    // react-fast-marquee owns the scrolling: it measures the band and repeats
    // the avatars as many times as it takes to fill it.
    await waitFor(() =>
      expect(container.querySelector(".rfm-marquee-container")).not.toBeNull(),
    );
    expect(
      container.querySelectorAll(".rfm-child").length,
    ).toBeGreaterThanOrEqual(10);
  });

  test("names the partners once, however often the strip repeats them", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(10));

    const { container } = renderMarquee();

    await waitFor(() =>
      expect(container.querySelector(".rfm-marquee-container")).not.toBeNull(),
    );
    // The repeated strip is decorative; the partners are listed once instead.
    expect(container.querySelectorAll("li")).toHaveLength(10);
    expect(
      container
        .querySelector(".rfm-marquee-container")
        ?.closest("[aria-hidden]"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  test("holds still when there are too few partners to loop", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(3));

    const { container } = renderMarquee();

    await waitFor(() =>
      expect(container.querySelectorAll("li")).toHaveLength(3),
    );
    expect(container.querySelector(".rfm-marquee-container")).toBeNull();
  });

  test("holds still for a reader who has asked for less movement", async () => {
    setReducedMotion(true);
    fetchPublicGroups.mockResolvedValue(groupsOf(10));

    const { container } = renderMarquee();

    await waitFor(() =>
      expect(container.querySelectorAll("li")).toHaveLength(10),
    );
    expect(container.querySelector(".rfm-marquee-container")).toBeNull();
  });

  test("renders nothing at all when there are no partners", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(0));

    const { container } = renderMarquee();

    await waitFor(() => expect(fetchPublicGroups).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test("labels the strip for anyone who cannot see it", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(10));

    renderMarquee();

    expect(
      await screen.findByRole("region", { name: /Practice spaces on WeBuddhist/i }),
    ).toBeInTheDocument();
  });

  test("does not shrink, so the label stays visible on a short screen", async () => {
    fetchPublicGroups.mockResolvedValue(groupsOf(10));

    renderMarquee();

    const band = await screen.findByRole("region", {
      name: /Practice spaces on WeBuddhist/i,
    });
    expect(band).toHaveClass("shrink-0");
    expect(band).toHaveClass("min-h-36");
  });
});
