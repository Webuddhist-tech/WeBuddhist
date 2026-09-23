import {
  mockReactQuery,
  mockTolgee,
  mockUseAuth,
  mockLocalStorage,
} from "../../test-utils/CommonMocks.ts";
import {
  vi,
  describe,
  beforeEach,
  test,
  expect,
  type Mock,
  type MockInstance,
} from "vitest";
import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter as Router, useParams } from "react-router-dom";
import * as reactQuery from "react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TolgeeProvider } from "@tolgee/react";
import Texts, { fetchCommentaries, fetchVersions } from "./Texts.tsx";

import {
  getTableOfContents,
  getTextVersionsByEdition,
  getTextCommentariesByEdition,
  getTextsByCollection,
} from "@/services/library";
mockUseAuth();
mockReactQuery();

const mockCloseResourcesPanel = vi.fn();
vi.mock("@/services/library", () => ({
  getTableOfContents: vi.fn(),
  getTextVersionsByEdition: vi.fn(),
  getTextCommentariesByEdition: vi.fn(),
  getTextsByCollection: vi.fn(),
}));

vi.mock("@/context/PanelContext.tsx", () => ({
  usePanelContext: () => ({
    closeResourcesPanel: mockCloseResourcesPanel,
  }),
}));

vi.mock("./versions/Versions.tsx", () => ({
  __esModule: true,
  default: () => <div data-testid="versions-component">Versions Component</div>,
}));

vi.mock("./commentaries/Commentaries.tsx", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="commentaries-component">Commentaries Component</div>
  ),
}));

vi.mock("../../utils/helperFunctions.tsx", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  mapLanguageCode: (code: string) => (code === "bo-IN" ? "bo" : code),
  getLanguageClass: () => "language-class",
  getEarlyReturn: () => "",
}));

vi.mock("../../utils/constants.ts", () => ({
  LANGUAGE: "LANGUAGE",
  siteName: "Webuddhist",
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
    useSearchParams: () => [new URLSearchParams("?type=works"), vi.fn()],
    useLocation: () => ({
      pathname: "/texts/123",
      state: {
        parentCollection: { id: "collection-123", title: "Test Collection" },
      },
    }),
  };
});

describe("Texts Component", () => {
  const tableOfContentsData = { contents: [{ id: "content-1" }] };
  const versionsData = { text: { title: "Sample Text", language: "bo-IN" } };
  const commentariesData = { items: [{ id: "commentary-1" }] };

  let localStorageMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = mockLocalStorage();
    localStorageMock.getItem.mockReturnValue("bo-IN");
    (useParams as unknown as Mock).mockReturnValue({ id: "123" });
    (reactQuery.useQuery as Mock).mockImplementation((queryKey: any) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === "table-of-contents") {
        return {
          data: tableOfContentsData,
          isLoading: false,
          error: undefined,
        };
      }
      if (key === "versions") {
        return { data: versionsData, isLoading: false, error: undefined };
      }
      if (key === "commentaries") {
        return { data: commentariesData, isLoading: false, error: undefined };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });
    (getTableOfContents as Mock).mockResolvedValue(tableOfContentsData);
  });

  const setup = () => {
    const queryClient = new QueryClient();
    return render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Texts />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );
  };

  test("renders title with language class", () => {
    const { container } = setup();
    const title = container.querySelector("p.language-class");
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent("Sample Text");
  });

  test("credits the text's contributors below the tabs", () => {
    (reactQuery.useQuery as Mock).mockImplementation((queryKey: any) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === "versions") {
        return {
          data: {
            text: {
              ...versionsData.text,
              contributors: [
                { type: "person", name: "Rinchen Zangpo", role: "translator" },
              ],
            },
          },
          isLoading: false,
          error: undefined,
        };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });

    const { container } = setup();

    expect(screen.getByText("Rinchen Zangpo")).toBeInTheDocument();
    expect(screen.getByText("Translator")).toBeInTheDocument();
    // Below the tabs: the credits are the last thing on the page.
    const section = container.querySelector("section");
    const tabs = container.querySelector('[role="tablist"]');
    expect(section).toBeInTheDocument();
    expect(
      tabs?.compareDocumentPosition(section as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("drops the credits while the commentary tab is open", async () => {
    const user = userEvent.setup();
    (reactQuery.useQuery as Mock).mockImplementation((queryKey: any) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === "versions") {
        return {
          data: {
            text: {
              ...versionsData.text,
              contributors: [
                { type: "person", name: "Rinchen Zangpo", role: "translator" },
              ],
            },
          },
          isLoading: false,
          error: undefined,
        };
      }
      if (key === "commentaries") {
        return { data: commentariesData, isLoading: false, error: undefined };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });

    setup();
    expect(screen.getByText("Rinchen Zangpo")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /commentary/i }));
    // Each commentary lists its own credits; the text's would read as theirs.
    expect(screen.queryByText("Rinchen Zangpo")).not.toBeInTheDocument();
  });

  test("leaves the credits out for a text with none", () => {
    const { container } = setup();
    expect(container.querySelector("section")).not.toBeInTheDocument();
  });

  test("shows versions tab by default and switches to commentaries", async () => {
    const user = userEvent.setup();
    setup();

    const versionsTab = screen.getByRole("tab", { name: /version/i });
    expect(versionsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("versions-component")).toBeInTheDocument();

    const commentariesTab = screen.getByRole("tab", { name: /commentary/i });
    await user.click(commentariesTab);
    expect(commentariesTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("commentaries-component")).toBeInTheDocument();
  });

  test("fetchVersions reads versions straight from the library", async () => {
    (getTextVersionsByEdition as Mock).mockResolvedValueOnce({ versions: [] });

    const result = await fetchVersions("123", 0, 10);

    expect(getTextVersionsByEdition).toHaveBeenCalledWith({
      editionId: "123",
      skip: 0,
      limit: 10,
    });
    expect(result).toEqual({ versions: [] });
  });

  test("fetchCommentaries wraps the library result in items", async () => {
    (getTextCommentariesByEdition as Mock).mockResolvedValueOnce([
      { id: "commentary-1" },
    ]);

    const result = await fetchCommentaries("123", 0, 10);

    expect(getTextCommentariesByEdition).toHaveBeenCalledWith({
      editionId: "123",
      skip: 0,
      limit: 10,
    });
    expect(result).toEqual({ items: [{ id: "commentary-1" }] });
  });

  test("renders parent collection breadcrumb when data is available", () => {
    (reactQuery.useQuery as Mock).mockImplementation((queryKey: any) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === "table-of-contents") {
        return {
          data: tableOfContentsData,
          isLoading: false,
          error: undefined,
        };
      }
      if (key === "versions") {
        return { data: versionsData, isLoading: false, error: undefined };
      }
      if (key === "commentaries") {
        return { data: commentariesData, isLoading: false, error: undefined };
      }
      if (key === "works") {
        return {
          data: { collection: { title: "Test Collection" } },
          isLoading: false,
          error: undefined,
        };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });

    setup();

    expect(screen.getByText("Test Collection")).toBeInTheDocument();
  });

  test("renders parent collection breadcrumb when data is available", () => {
    (reactQuery.useQuery as Mock).mockImplementation((queryKey: any) => {
      const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      if (key === "table-of-contents") {
        return {
          data: tableOfContentsData,
          isLoading: false,
          error: undefined,
        };
      }
      if (key === "versions") {
        return { data: versionsData, isLoading: false, error: undefined };
      }
      if (key === "commentaries") {
        return { data: commentariesData, isLoading: false, error: undefined };
      }
      if (key === "works") {
        return {
          data: { collection: { title: "Test Collection" } },
          isLoading: false,
          error: undefined,
        };
      }
      return { data: undefined, isLoading: false, error: undefined };
    });

    setup();

    expect(screen.getByText("Test Collection")).toBeInTheDocument();
  });

  test("renders compact view and handles title click with addChapter", async () => {
    const user = userEvent.setup();
    const mockAddChapter = vi.fn();

    const queryClient = new QueryClient();
    render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Texts
              isCompactView={true}
              collection_id="123"
              addChapter={mockAddChapter}
              currentChapter="ch1"
            />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );

    const titleButton = screen.getByRole("button");
    await user.click(titleButton);

    expect(mockAddChapter).toHaveBeenCalledWith({ textId: "123" }, "ch1");
    expect(mockCloseResourcesPanel).toHaveBeenCalled();
  });

  test("handles title click with addChapter even when table of contents has no data", async () => {
    const user = userEvent.setup();
    const mockAddChapter = vi.fn();

    vi.spyOn(reactQuery, "useQuery").mockImplementation(((
      queryKey: string[],
    ) => {
      if (queryKey[0] === "table-of-contents") {
        return { data: undefined, isLoading: false, error: undefined };
      }
      if (queryKey[0] === "versions") {
        return { data: versionsData, isLoading: false, error: undefined };
      }
      if (queryKey[0] === "commentaries") {
        return { data: commentariesData, isLoading: false, error: undefined };
      }
      return { data: undefined, isLoading: false, error: undefined };
    }) as any);

    const queryClient = new QueryClient();
    render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Texts
              isCompactView={true}
              collection_id="123"
              addChapter={mockAddChapter}
              currentChapter="ch1"
            />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );

    const titleButton = screen.getByRole("button");
    await user.click(titleButton);

    expect(mockAddChapter).toHaveBeenCalledWith({ textId: "123" }, "ch1");
    expect(mockCloseResourcesPanel).toHaveBeenCalled();
  });
});
