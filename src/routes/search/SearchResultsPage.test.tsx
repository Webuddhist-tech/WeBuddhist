import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { vi, describe, test, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// The shared test setup stubs react-query; this page uses the real one.
vi.mock("react-query", async () => await vi.importActual("react-query"));

vi.mock("@tolgee/react", () => ({
  useTolgee: () => ({ getLanguage: () => "en" }),
  useTranslate: () => ({
    t: (
      key: string,
      fallback?: string | Record<string, unknown>,
      params?: Record<string, unknown>,
    ) => {
      const text = typeof fallback === "string" ? fallback : key;
      const values = typeof fallback === "object" ? fallback : params;
      return text.replace(/\{(\w+)\}/g, (_, name) =>
        String(values?.[name] ?? ""),
      );
    },
  }),
}));

vi.mock("../commons/seo/Seo.tsx", () => ({
  __esModule: true,
  default: () => null,
}));

const DownloadAppModal = vi.fn((_: { open: boolean }) => null);
vi.mock("../../components/DownloadAppModal.tsx", () => ({
  __esModule: true,
  default: (props: { open: boolean }) => DownloadAppModal(props),
}));

vi.mock("../../utils/deviceUtils.ts", () => ({
  isMobileDevice: () => false,
  openAppDownloadPage: vi.fn(),
}));

// The verse list has its own tests; here it only has to be rendered.
vi.mock("./sources/Sources", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: ({ preview }: { preview?: boolean }) => (
    <div data-testid="verses">{preview ? "preview" : "full"}</div>
  ),
}));

const findTextsByTitle = vi.fn();
const multilingualSearch = vi.fn();
vi.mock("@/services/library", () => ({
  findTextsByTitle: (...args: unknown[]) => findTextsByTitle(...args),
  multilingualSearch: (...args: unknown[]) => multilingualSearch(...args),
}));

const searchPractice = vi.fn();
const searchMantras = vi.fn();
const searchGroups = vi.fn();
const fetchPlanSummary = vi.fn();
vi.mock("./api/searchApi.ts", () => ({
  searchPractice: (...args: unknown[]) => searchPractice(...args),
  searchMantras: (...args: unknown[]) => searchMantras(...args),
  searchGroups: (...args: unknown[]) => searchGroups(...args),
  fetchPlanSummary: (...args: unknown[]) => fetchPlanSummary(...args),
}));

const fetchFeaturedEvents = vi.fn();
vi.mock("../live-events/api/eventsApi.ts", () => ({
  fetchFeaturedEvents: (...args: unknown[]) => fetchFeaturedEvents(...args),
}));

import SearchResultsPage from "./SearchResultsPage.tsx";

const HOUR = 60 * 60 * 1000;

const renderPage = (search = "?q=tara") =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[`/search${search}`]}>
        <Routes>
          <Route
            path="/search"
            element={
              <>
                <SearchResultsPage />
                {/* Stands in for the top bar's search box. */}
                <Link to="/search?q=send">search again</Link>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const empty = { pagination: { page: 1, page_size: 10, total: 0 }, items: [] };

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  findTextsByTitle.mockResolvedValue({
    hasMore: false,
    items: [
      { id: "t1", title: "Praise to Tārā", language: "en", matchedTitle: null },
    ],
  });
  multilingualSearch.mockResolvedValue({
    query: "tara",
    total: 4,
    sources: [],
  });
  searchPractice.mockImplementation(async ({ kind }: { kind: string }) =>
    kind === "series"
      ? {
          pagination: { page: 1, page_size: 10, total: 1 },
          items: [
            {
              id: "s1",
              type: "series",
              metadata: { title: "Tārā's Profound Essence" },
              plans_count: 3,
            },
          ],
        }
      : {
          pagination: { page: 1, page_size: 10, total: 1 },
          items: [{ id: "p1", type: "plan", title: "Tara Bumtsok" }],
        },
  );
  fetchPlanSummary.mockResolvedValue({
    id: "p1",
    series_id: "s1",
    total_days: 21,
  });
  searchMantras.mockResolvedValue({
    total: 1,
    accumulators: [
      {
        id: "m1",
        metadata: [],
        mantra: { title: "Green Tara", mantra: "Om tare" },
      },
    ],
  });
  searchGroups.mockResolvedValue({ total: 0, groups: [] });
  fetchFeaturedEvents.mockResolvedValue([
    {
      id: "e1",
      group_name: "Sangha",
      metadata: [{ name: "Tara Puja", language: "en" }],
      start_date: new Date(Date.now() - HOUR).toISOString(),
      end_date: new Date(Date.now() + HOUR).toISOString(),
    },
    {
      id: "e2",
      group_name: "Sangha",
      metadata: [{ name: "Medicine Buddha", language: "en" }],
      start_date: new Date(Date.now() - HOUR).toISOString(),
      end_date: new Date(Date.now() + HOUR).toISOString(),
    },
  ]);
});

describe("SearchResultsPage", () => {
  test("shows a section for each kind of result, and leaves out empty ones", async () => {
    renderPage();

    expect(
      await screen.findByRole("link", { name: /Praise to Tārā/ }),
    ).toHaveAttribute("href", "/texts/t1?type=root_text");
    expect(await screen.findByTestId("verses")).toHaveTextContent("preview");
    expect(
      await screen.findByRole("link", { name: /Profound Essence/ }),
    ).toHaveAttribute("href", "/plans?series=s1&lang=en");
    expect(
      await screen.findByRole("button", { name: /Green Tara/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /Tara Puja/ }),
    ).toHaveAttribute("href", "/live/e1");

    // No practice space matched, so there is no Practice spaces section.
    expect(
      screen.queryByRole("heading", { name: "Practice spaces" }),
    ).not.toBeInTheDocument();
    // Events are filtered by title here, since the API cannot search them.
    expect(screen.queryByText("Medicine Buddha")).not.toBeInTheDocument();
  });

  test("searches series and single plans, linking a plan inside its series", async () => {
    renderPage();

    const plan = await screen.findByRole("link", { name: /Tara Bumtsok/ });
    // The link waits on the plan's series, which search does not return.
    await waitFor(() =>
      expect(plan).toHaveAttribute("href", "/plans?series=s1&plan=p1&lang=en"),
    );
    expect(screen.getByText("21 days")).toBeInTheDocument();
    expect(searchPractice).toHaveBeenCalledWith(
      expect.objectContaining({ query: "tara", kind: "series" }),
    );
    expect(searchPractice).toHaveBeenCalledWith(
      expect.objectContaining({ query: "tara", kind: "plans" }),
    );
  });

  test("puts each section's count beside its heading, with no filter tabs", async () => {
    renderPage();

    const heading = (name: RegExp) => screen.findByRole("heading", { name });
    expect(await heading(/^Plans/)).toHaveTextContent("2");
    expect(await heading(/^Verses/)).toHaveTextContent("4");
    expect(
      screen.queryByRole("navigation", { name: /categories/i }),
    ).not.toBeInTheDocument();
  });

  test("expands a section in place to show the rest of its results", async () => {
    findTextsByTitle.mockResolvedValue({
      hasMore: false,
      items: ["One", "Two", "Three", "Four", "Five"].map((name, index) => ({
        id: `t${index}`,
        title: `Tara ${name}`,
        language: "en",
        matchedTitle: null,
      })),
    });

    renderPage();

    const section = (
      await screen.findByRole("heading", { name: /^Texts/ })
    ).closest("section") as HTMLElement;
    await waitFor(() => expect(section.querySelectorAll("a")).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Show all texts" }));

    expect(section.querySelectorAll("a")).toHaveLength(5);
    expect(
      screen.queryByRole("button", { name: "Show all texts" }),
    ).not.toBeInTheDocument();
  });

  test("starts every section afresh when the search changes", async () => {
    findTextsByTitle.mockImplementation(
      async ({ query }: { query: string }) => ({
        hasMore: false,
        items: ["One", "Two", "Three", "Four", "Five"].map((name, index) => ({
          id: `${query}-${index}`,
          title: `${query} ${name}`,
          language: "en",
          matchedTitle: null,
        })),
      }),
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Show all texts" }),
    );
    expect(
      screen.queryByRole("button", { name: "Show all texts" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "search again" }));

    // Collapsed again for the new search - an expanded verse list kept its
    // page, and page 2 of the new search could be empty.
    expect(
      await screen.findByRole("link", { name: /send One/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show all texts" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /send Four/ })).toBeNull();
  });

  test("offers the app for a mantra, which is counted there", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Green Tara/ }));

    expect(DownloadAppModal).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: true }),
    );
  });

  test("says so when nothing matched anywhere", async () => {
    findTextsByTitle.mockResolvedValue({ hasMore: false, items: [] });
    multilingualSearch.mockResolvedValue({
      query: "zz",
      total: 0,
      sources: [],
    });
    searchPractice.mockResolvedValue(empty);
    searchMantras.mockResolvedValue({ total: 0, accumulators: [] });

    renderPage("?q=zz");

    expect(
      await screen.findByText("Nothing matched “zz”."),
    ).toBeInTheDocument();
  });

  test("asks for a search term when there is none", () => {
    renderPage("");

    expect(
      screen.getByText("Type something to search for."),
    ).toBeInTheDocument();
    expect(findTextsByTitle).not.toHaveBeenCalled();
  });
});
