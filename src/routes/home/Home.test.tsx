import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { vi, describe, test, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// The shared test setup stubs react-query's useQuery; the sections use real ones.
vi.mock("react-query", async () => await vi.importActual("react-query"));

vi.mock("@tolgee/react", () => ({
  useTolgee: () => ({ getLanguage: () => "en" }),
  useTranslate: () => ({
    t: (
      _key: string,
      fallback?: string,
      params?: Record<string, string | number>,
    ) =>
      (fallback ?? _key).replace(/\{(\w+)\}/g, (_, name) =>
        String(params?.[name] ?? ""),
      ),
  }),
}));

vi.mock("../commons/seo/Seo.tsx", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../components/DownloadAppModal.tsx", () => ({
  __esModule: true,
  default: () => null,
}));

const fetchVerseOfDayToday = vi.fn();
const fetchPublicSeries = vi.fn();
vi.mock("../planviewer/api/plansApi.ts", () => ({
  fetchVerseOfDayToday: (...args: unknown[]) => fetchVerseOfDayToday(...args),
  fetchPublicSeries: (...args: unknown[]) => fetchPublicSeries(...args),
}));

const fetchPresetAccumulators = vi.fn();
const fetchPublicGroups = vi.fn();
vi.mock("../mantras/api/accumulatorApi.ts", () => ({
  fetchPresetAccumulators: (...args: unknown[]) =>
    fetchPresetAccumulators(...args),
  fetchPublicGroups: (...args: unknown[]) => fetchPublicGroups(...args),
}));

const fetchCollections = vi.fn();
vi.mock("../collections/Collections.tsx", () => ({
  fetchCollections: (...args: unknown[]) => fetchCollections(...args),
}));

const fetchFeaturedEvents = vi.fn();
vi.mock("../live-events/api/eventsApi.ts", () => ({
  fetchFeaturedEvents: (...args: unknown[]) => fetchFeaturedEvents(...args),
}));

import Home from "./Home.tsx";

const HOUR = 60 * 60 * 1000;

const event = (id: string, name: string, startOffset: number) => ({
  id,
  group_name: "Sangha",
  metadata: [{ name, language: "en" }],
  start_date: new Date(Date.now() + startOffset).toISOString(),
  end_date: new Date(Date.now() + startOffset + 2 * HOUR).toISOString(),
  image: null,
});

const renderHome = (initialEntry = "/") =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plans" element={<div>plans page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchVerseOfDayToday.mockResolvedValue({ verse_of_day: null });
  fetchPublicSeries.mockResolvedValue({
    series: [
      {
        id: "s-1",
        metadata: [{ language: "EN", title: "Daily Tipitaka" }],
        image: "https://img.test/a.jpg",
        featured: false,
        total_days: 195,
        plan_count: 27,
      },
      {
        id: "s-2",
        metadata: [{ language: "EN", title: "Bodhisattva Challenge" }],
        image: "https://img.test/b.jpg",
        featured: true,
        total_days: 358,
        plan_count: 37,
      },
      // No artwork, so it never makes it onto the page.
      { id: "s-3", metadata: [{ language: "EN", title: "Bare" }], image: null },
    ],
  });
  fetchPublicGroups.mockResolvedValue({
    total: 2,
    groups: [
      {
        id: "g-1",
        slug: "sakya",
        is_public: true,
        metadata: [{ language: "EN", title: "Sakya Centre" }],
        avatar_url: "https://img.test/g1.png",
      },
    ],
  });
  fetchPresetAccumulators.mockResolvedValue({
    accumulators: [
      {
        id: "m-1",
        metadata: [],
        mantra: { title: "Green Tara", mala_image_url: "https://img.test/1" },
      },
      {
        id: "m-2",
        metadata: [],
        mantra: { title: "Manjushri", mala_image_url: "https://img.test/2" },
      },
    ],
  });
  fetchCollections.mockResolvedValue({
    collections: [
      { id: "c-1", title: "Liturgy", has_child: false, language: "en" },
      { id: "c-2", title: "Middle Way", has_child: true, language: "en" },
    ],
  });
  fetchFeaturedEvents.mockResolvedValue([
    event("e-live", "Tara Puja", -HOUR),
    event("e-past", "Old Retreat", -10 * HOUR),
  ]);
});

describe("Home", () => {
  test("quotes today's verse and links to the verse page", async () => {
    fetchVerseOfDayToday.mockResolvedValue({
      verse_of_day: {
        verse:
          "Know all compounded phenomena to be like this.\n ~Vajracchedikā",
        date: "2026-10-03",
      },
    });

    renderHome();

    expect(
      await screen.findByText(/Know all compounded phenomena/),
    ).toBeInTheDocument();
    expect(screen.getByText("Vajracchedikā")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read now" })).toHaveAttribute(
      "href",
      "/verse-of-the-day",
    );
  });

  test("lists the library's collections as links onto their shelves", async () => {
    renderHome();

    expect(
      await screen.findByRole("link", { name: "Liturgy" }),
    ).toHaveAttribute("href", "/works/c-1");
    // A collection with sub-collections opens the library to browse them.
    expect(screen.getByRole("link", { name: "Middle Way" })).toHaveAttribute(
      "href",
      "/collections",
    );
  });

  test("shows what is live and leaves finished events out", async () => {
    renderHome();

    const card = await screen.findByRole("link", { name: /Tara Puja/ });
    expect(card).toHaveAttribute("href", "/live/e-live");
    expect(screen.queryByText("Old Retreat")).not.toBeInTheDocument();
  });

  test("leaves the live panel out when nothing is on or coming up", async () => {
    fetchFeaturedEvents.mockResolvedValue([
      event("e-past", "Old Retreat", -10 * HOUR),
    ]);

    renderHome();

    await screen.findByRole("link", { name: "Liturgy" });
    expect(
      screen.queryByText("Practise together, as it happens"),
    ).not.toBeInTheDocument();
  });

  test("shows plan series with artwork, featured first, linking to the plan", async () => {
    renderHome();

    const plans = await screen.findAllByRole("link", {
      name: /Bodhisattva Challenge|Daily Tipitaka/,
    });
    expect(plans.map((link) => link.getAttribute("href"))).toEqual([
      "/plans?series=s-2&lang=en",
      "/plans?series=s-1&lang=en",
    ]);
    expect(screen.getByText("358 days")).toBeInTheDocument();
    expect(screen.queryByText("Bare")).not.toBeInTheDocument();
  });

  test("links each group tile to the group's own page", async () => {
    renderHome();

    expect(
      await screen.findByRole("link", { name: /Sakya Centre/ }),
    ).toHaveAttribute("href", "/group/@sakya");
  });

  test("strings one bead per preset mantra", async () => {
    renderHome();

    expect(await screen.findByAltText("Green Tara")).toBeInTheDocument();
    expect(screen.getByAltText("Manjushri")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Get the app/i }),
    ).toBeInTheDocument();
  });

  test("uses the day's verse picture in the hero once it arrives", async () => {
    fetchVerseOfDayToday.mockResolvedValue({
      verse_of_day: { image_url: "https://img.test/verse.jpg" },
    });

    renderHome();

    await waitFor(() =>
      expect(screen.getByTestId("hero-image")).toHaveAttribute(
        "src",
        "https://img.test/verse.jpg",
      ),
    );
  });

  test("falls back to the Buddha image when the verse picture fails to load", async () => {
    fetchVerseOfDayToday.mockResolvedValue({
      verse_of_day: { image_url: "https://img.test/gone.jpg" },
    });

    renderHome();

    const image = screen.getByTestId("hero-image");
    await waitFor(() =>
      expect(image).toHaveAttribute("src", "https://img.test/gone.jpg"),
    );
    fireEvent.error(image);

    expect(screen.getByTestId("hero-image")).toHaveAttribute(
      "src",
      "/img/buddha_hero.jpg",
    );
  });

  test("sends links made before the practice area moved to /plans", () => {
    renderHome("/?series=series-1&plan=plan-1");

    expect(screen.getByText("plans page")).toBeInTheDocument();
  });

  test("stays on the front page when there are no practice params", () => {
    renderHome("/?lang=en");

    expect(screen.queryByText("plans page")).not.toBeInTheDocument();
    expect(screen.getByText("Read the texts")).toBeInTheDocument();
  });
});
