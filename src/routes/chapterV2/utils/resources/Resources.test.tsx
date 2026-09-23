import { vi, beforeEach, describe, test, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "react-query";
import * as reactQuery from "react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import { TolgeeProvider } from "@tolgee/react";
import Resources, { fetchSidePanelData } from "./Resources.tsx";
import { mockTolgee } from "../../../../test-utils/CommonMocks.ts";
import axiosInstance from "../../../../config/axios-config.ts";

import { getSegmentInfo } from "@/services/library";
vi.mock("@/services/library", () => ({
  getSegmentInfo: vi.fn(),
}));

vi.mock("../../../../utils/helperFunctions.tsx", () => ({
  mapLanguageCode: (code) => (code === "bo-IN" ? "bo" : code),
}));

const mockContext = {
  isResourcesPanelOpen: true,
  isTranslationSourceOpen: false,
  openResourcesPanel: vi.fn(),
  closeResourcesPanel: vi.fn(),
  toggleResourcesPanel: vi.fn(),
  openTranslationSource: vi.fn(),
  closeTranslationSource: vi.fn(),
  toggleTranslationSource: vi.fn(),
};

vi.mock("../../../../context/PanelContext.tsx", () => ({
  usePanelContext: () => mockContext,
}));

vi.mock("@tolgee/react", async () => {
  const actual = await vi.importActual("@tolgee/react");
  return {
    ...actual,
    useTranslate: () => ({
      t: (key) => key,
    }),
  };
});

vi.mock("../../../../utils/constants.ts", () => ({
  LANGUAGE: "LANGUAGE",
  MENU_ITEMS: [
    { label: "common.share", icon: () => null },
    { label: "connection_panel.compare_text", icon: () => null },
  ],
}));

vi.mock("./components/root-texts/RootText.tsx", () => ({
  default: ({ setIsRootTextView }) => (
    <div data-testid="root-text-view">
      Root Text View
      <button onClick={() => setIsRootTextView("main")}>Back</button>
    </div>
  ),
}));

vi.mock("./components/compare-text/CompareText.tsx", () => {
  return {
    default: ({ setIsCompareTextView, addChapter, currentChapter }) => (
      <div data-testid="compare-text-view">
        <div>Compare Text Component</div>
        <button onClick={() => setIsCompareTextView("main")}>Close</button>
      </div>
    ),
  };
});

describe("Resources Side Panel", () => {
  const queryClient = new QueryClient();
  const mockTextData = {
    text: {
      title: "Test Title",
      id: "test123",
    },
  };
  const mockSidePanelData = {
    segment_info: {
      short_url: "https://test.com/share",
      translations: 2,
      resources: {
        sheets: 3,
      },
      related_text: {
        commentaries: 2,
        root_text: 1,
      },
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "textDetail") {
        return { data: mockTextData, isLoading: false };
      } else if (queryKey[0] === "sidePanel") {
        return { data: mockSidePanelData, isLoading: false };
      }
      return { data: null, isLoading: false };
    });
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => "bo-IN"),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    // mockSearchParams.delete('segment_id')
  });

  const setup = () => {
    return render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Resources
              segmentId={"test123"}
              addChapter={() => vi.fn()}
              setVersionId={() => vi.fn()}
              versionId={"version1"}
            />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );
  };

  test("fetchSidePanelData makes correct API call", async () => {
    const segmentId = "test123";
    (getSegmentInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockSidePanelData,
    );

    const result = await fetchSidePanelData(segmentId);

    expect(getSegmentInfo).toHaveBeenCalledWith(segmentId);
    expect(result).toEqual(mockSidePanelData);
  });

  test("shows translation view when clicking on translations option", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return {
          data: {
            segment_info: {
              translations: 5,
            },
          },
        };
      }
      return { data: null, isLoading: false };
    });

    const { container } = setup();

    const translationText = screen.getByText(/connection_pannel\.translations/);
    fireEvent.click(translationText);
    expect(screen.queryByText(/side_nav\.about_text/)).not.toBeInTheDocument();
  });

  test("shows commentary view when clicking on commentary option", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return {
          data: {
            segment_info: {
              related_text: {
                commentaries: 2,
              },
            },
          },
        };
      }
      return { data: null, isLoading: false };
    });

    const { container } = setup();
    const commentaryText = screen.getByText(/text\.commentary/);
    fireEvent.click(commentaryText);

    expect(screen.queryByText(/side_nav\.about_text/)).not.toBeInTheDocument();
  });

  test("shows share view when clicking on share menu item", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return { data: mockSidePanelData };
      }
      return { data: null, isLoading: false };
    });

    const { container } = setup();
    const shareItems = screen.getAllByText(/common\.share/);
    fireEvent.click(shareItems[0]);

    expect(screen.queryByText(/side_nav\.about_text/)).not.toBeInTheDocument();
  });

  test("toggles visibility with showPanel prop", () => {
    const originalIsResourcesPanelOpen = mockContext.isResourcesPanelOpen;
    mockContext.isResourcesPanelOpen = false;

    const { container } = render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Resources
              segmentId={"test123"}
              setVersionId={() => vi.fn()}
              versionId={"version1"}
            />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );

    const panel = container.firstChild;
    expect(panel).toHaveClass("hidden");
    mockContext.isResourcesPanelOpen = originalIsResourcesPanelOpen;
  });

  test("shows root text view when clicking on root text option", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return {
          data: {
            segment_info: {
              related_text: {
                root_text: 2,
              },
            },
          },
        };
      }
      return { data: null, isLoading: false };
    });

    setup();
    const rootTextElement = screen.getByText(/text\.root_text/);
    fireEvent.click(rootTextElement);

    expect(screen.getByTestId("root-text-view")).toBeInTheDocument();
  });

  test("offers the contributors view, with a count, when the text is credited", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return { data: { segment_info: { text_id: "text-1" } } };
      }
      if (queryKey[0] === "text-contributors") {
        return {
          data: [
            { type: "person", name: "Sarvajnadeva", role: "translator" },
            { type: "person", name: "Rinchen Zangpo", role: "translator" },
          ],
          isLoading: false,
        };
      }
      return { data: null, isLoading: false };
    });

    setup();
    const contributorsButton = screen.getByText(/panel\.contributors \(2\)/);
    fireEvent.click(contributorsButton);

    expect(screen.getByText("Sarvajnadeva")).toBeInTheDocument();
    expect(screen.getByText("Rinchen Zangpo")).toBeInTheDocument();
  });

  test("hides the contributors view when the text has no credits", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return { data: { segment_info: { text_id: "text-1" } } };
      }
      if (queryKey[0] === "text-contributors") {
        return { data: [], isLoading: false };
      }
      return { data: null, isLoading: false };
    });

    setup();
    expect(screen.queryByText(/panel\.contributors/)).not.toBeInTheDocument();
  });

  test("renders menu items correctly", () => {
    setup();

    expect(screen.getByText("common.share")).toBeInTheDocument();
    expect(
      screen.getByText("connection_panel.compare_text"),
    ).toBeInTheDocument();
  });

  test("closes panel when close button is clicked", () => {
    const { container } = setup();

    const header = container.querySelector(".sticky.top-0");
    const closeButton = header?.querySelector(
      'button[type="button"]:last-child',
    ) as HTMLButtonElement;
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton);
    expect(mockContext.closeResourcesPanel).toHaveBeenCalled();
  });

  test("shows compare text view when clicking on compare text option", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation((queryKey) => {
      if (queryKey[0] === "sidePanel") {
        return {
          data: {
            segment_info: {
              related_text: {
                compare_text: 2,
              },
            },
          },
        };
      }
      return { data: null, isLoading: false };
    });

    setup();
    const compareTextElement = screen.getByText(
      /connection_panel\.compare_text/,
    );
    fireEvent.click(compareTextElement);

    expect(screen.getByTestId("compare-text-view")).toBeInTheDocument();
  });
});
