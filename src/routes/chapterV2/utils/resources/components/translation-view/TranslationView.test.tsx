import { vi, describe, test, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "react-query";
import * as reactQuery from "react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { PanelProvider } from "../../../../../../context/PanelContext";
import { TolgeeProvider } from "@tolgee/react";
import TranslationView, { fetchTranslationsData } from "./TranslationView";
import "@testing-library/jest-dom";
import { mockTolgee } from "../../../../../../test-utils/CommonMocks";
import axiosInstance from "../../../../../../config/axios-config";

import { getSegmentTranslations } from "@/services/library";
vi.mock("@/services/library", () => ({
  getSegmentTranslations: vi.fn(),
}));

vi.mock("@tolgee/react", async () => {
  const actual = await vi.importActual("@tolgee/react");
  return {
    ...actual,
    useTranslate: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock(
  "../../../../../../utils/helperFunctions.tsx",
  async (importOriginal) => ({
    ...((await importOriginal()) as object),
    getLanguageClass: (language: string) =>
      language === "bo" ? "bo-text" : "en-text",
  }),
);

vi.mock("../../../../../../config/axios-config", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockCloseResourcesPanel = vi.fn();
vi.mock("../../../../../../context/PanelContext", async () => {
  const actual = await vi.importActual(
    "../../../../../../context/PanelContext",
  );
  return {
    ...actual,
    usePanelContext: () => ({
      closeResourcesPanel: mockCloseResourcesPanel,
    }),
  };
});

const mockSessionStorage: Record<string, string | null> = {};
Object.defineProperty(window, "sessionStorage", {
  value: {
    getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      mockSessionStorage[key] = value;
    }),
    clear: vi.fn(() => {
      Object.keys(mockSessionStorage).forEach(
        (key) => delete mockSessionStorage[key],
      );
    }),
  },
  writable: true,
});

describe("TranslationView Component", () => {
  const queryClient = new QueryClient();
  const mockTranslationData = {
    translations: [
      {
        language: "en",
        title: "English Title",
        source_link: "English Source",
        text_id: "text-123",
        segments: [{ id: "seg-en-1", content: "English translation content" }],
      },
      {
        language: "bo",
        title: "Tibetan Title",
        source_link: "Tibetan Source",
        text_id: "text-456",
        segments: [{ id: "seg-bo-1", content: "Tibetan translation content" }],
      },
      {
        language: "en",
        title: "Another English Title",
        source_link: "Another English Source",
        text_id: "text-789",
        segments: [{ id: "seg-en-2", content: "Another English translation" }],
      },
    ],
  };

  let mockSetIsTranslationView: ReturnType<typeof vi.fn>;
  let mockSetVersionId: ReturnType<typeof vi.fn>;
  let mockAddChapter: ReturnType<typeof vi.fn>;
  let mockHandleNavigate: ReturnType<typeof vi.fn>;
  let currentChapter: { textId: string; segmentId: string };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetIsTranslationView = vi.fn();
    mockSetVersionId = vi.fn();
    mockAddChapter = vi.fn();
    mockHandleNavigate = vi.fn();
    currentChapter = {
      textId: "mock-text-1",
      segmentId: "test-segment-id",
    };

    // Clear mock session storage
    Object.keys(mockSessionStorage).forEach(
      (key) => delete mockSessionStorage[key],
    );

    vi.spyOn(reactQuery, "useQuery").mockImplementation(((
      queryKey: string[],
    ) => {
      if (queryKey[0] === "sidePanelTranslations") {
        return { data: mockTranslationData, isLoading: false };
      }
      return { data: null, isLoading: false };
    }) as any);
  });

  const setup = (props: Record<string, unknown> = {}) => {
    const defaultProps = {
      segmentId: "test-segment-id",
      setIsTranslationView: mockSetIsTranslationView,
      setVersionId: mockSetVersionId,
      addChapter: mockAddChapter,
      currentChapter: currentChapter,
      handleNavigate: mockHandleNavigate,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
          <PanelProvider>
            <TranslationView {...defaultProps} {...props} />
          </PanelProvider>
        </TolgeeProvider>
      </QueryClientProvider>,
    );
  };

  test("renders TranslationView component with header", () => {
    setup();
    expect(
      screen.getByText("connection_pannel.translations"),
    ).toBeInTheDocument();
  });

  test("displays language groups correctly", () => {
    setup();

    expect(screen.getByText("language.english")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();

    expect(screen.getByText("language.tibetan")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
  });

  test("closes translation view when close icon is clicked", () => {
    const { container } = setup();

    const buttons = container.querySelectorAll('button[type="button"]');
    const closeButton = buttons[buttons.length - 1];

    fireEvent.click(closeButton);
    expect(mockSetIsTranslationView).toHaveBeenCalledWith("main");
  });

  test("displays current selection status correctly", () => {
    mockSessionStorage["versionId"] = "text-123";

    setup();

    expect(
      screen.getByText("text.translation.current_selected"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("common.select")).toHaveLength(2);
  });

  test("fetchTranslationsData makes correct API call", async () => {
    (getSegmentTranslations as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockTranslationData,
    );

    const segmentId = "test-segment-id";
    const result = await fetchTranslationsData(segmentId);

    expect(getSegmentTranslations).toHaveBeenCalledWith({
      segmentId: "test-segment-id",
      skip: 0,
      limit: 10,
    });

    expect(result).toEqual(mockTranslationData);
  });

  test("fetchTranslationsData with custom skip and limit", async () => {
    (getSegmentTranslations as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockTranslationData,
    );

    const segmentId = "test-segment-id";
    const skip = 5;
    const limit = 20;

    await fetchTranslationsData(segmentId, skip, limit);

    expect(getSegmentTranslations).toHaveBeenCalledWith({
      segmentId: "test-segment-id",
      skip: 5,
      limit: 20,
    });
  });

  test("fetchTranslationsData handles errors gracefully", async () => {
    (getSegmentTranslations as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("API Error"),
    );

    try {
      await fetchTranslationsData("test-segment-id");
      expect(true).toBe(false);
    } catch (error: unknown) {
      expect(error).toBeDefined();
      expect((error as Error).message).toBe("API Error");
    }
  });

  test("handles empty translations gracefully", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: { translations: [] },
      isLoading: false,
    })) as any);

    setup();

    expect(
      screen.getByText("connection_pannel.translations"),
    ).toBeInTheDocument();
  });

  test("handles undefined translations data gracefully", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: undefined,
      isLoading: false,
    })) as any);

    setup();

    expect(
      screen.getByText("connection_pannel.translations"),
    ).toBeInTheDocument();
  });

  test("calls addChapter and closeResourcesPanel when 'Open Text' button is clicked", () => {
    setup();

    const openTextButtons = screen.getAllByText("text.translation.open_text");
    expect(openTextButtons).toHaveLength(3);

    fireEvent.click(openTextButtons[0]);

    expect(mockAddChapter).toHaveBeenCalledWith(
      {
        textId: "text-123",
        segmentId: "seg-en-1",
      },
      currentChapter,
    );
    expect(mockCloseResourcesPanel).toHaveBeenCalled();
  });

  test("renders translation content with correct language classes", () => {
    const { container } = setup();

    const englishElements = container.querySelectorAll(".en-text");
    const tibetanElements = container.querySelectorAll(".bo-text");

    expect(englishElements.length).toBeGreaterThan(0);
    expect(tibetanElements.length).toBeGreaterThan(0);
  });

  test("does not render 'Open Text' button when addChapter is undefined", () => {
    setup({ addChapter: undefined });

    expect(
      screen.queryByText("text.translation.open_text"),
    ).not.toBeInTheDocument();
  });

  test("calls handleNavigate when back button is clicked", () => {
    const { container } = setup();

    const buttons = container.querySelectorAll('button[type="button"]');
    const backButton = buttons[0];

    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(mockHandleNavigate).toHaveBeenCalled();
  });

  test("renders loading state when data is loading", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: undefined,
      isLoading: true,
    })) as any);

    setup();

    expect(
      screen.getByText("connection_pannel.translations"),
    ).toBeInTheDocument();
  });

  test("calls setVersionId when select button is clicked", () => {
    setup();

    const selectButtons = screen.getAllByText("common.select");
    fireEvent.click(selectButtons[0]);

    expect(mockSetVersionId).toHaveBeenCalled();
  });

  test("renders translation titles correctly", () => {
    setup();

    expect(screen.getByText("English Title")).toBeInTheDocument();
    expect(screen.getByText("Tibetan Title")).toBeInTheDocument();
    expect(screen.getByText("Another English Title")).toBeInTheDocument();
  });

  test("renders translation sources correctly", () => {
    setup();

    expect(screen.getByText("English Source")).toBeInTheDocument();
    expect(screen.getByText("Tibetan Source")).toBeInTheDocument();
    expect(screen.getByText("Another English Source")).toBeInTheDocument();
  });

  test("labels each segment with its structural type", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: {
        translations: [
          {
            language: "en",
            title: "English Title",
            text_id: "text-123",
            segments: [
              { id: "s-1", content: "A verse", type: "verse" },
              { id: "s-2", content: "The colophon", type: "back_matter" },
            ],
          },
        ],
      },
      isLoading: false,
    })) as any);

    setup();

    // Tolgee is mocked to echo the key, so the label shows the key it asked for.
    expect(screen.getByText("segment.type.verse")).toBeInTheDocument();
    expect(screen.getByText("segment.type.back_matter")).toBeInTheDocument();
  });

  test("names a group whose metadata could not be fetched", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: {
        translations: [
          {
            language: null,
            title: "",
            text_id: "text-123",
            segments: [{ id: "s-1", content: "Orphaned content" }],
          },
        ],
      },
      isLoading: false,
    })) as any);

    setup();

    // The heading is the group's only identifier, so it says the title is
    // missing rather than disappearing and leaving the segments unattributed.
    expect(
      screen.getByText("connection_panel.untitled_text"),
    ).toBeInTheDocument();
    expect(screen.getByText("Orphaned content")).toBeInTheDocument();
  });

  test("renders no type label for a segment that has no type", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementationOnce((() => ({
      data: {
        translations: [
          {
            language: "en",
            title: "English Title",
            text_id: "text-123",
            segments: [{ id: "s-1", content: "Untyped", type: null }],
          },
        ],
      },
      isLoading: false,
    })) as any);

    setup();

    expect(screen.queryByText(/^segment\.type\./)).not.toBeInTheDocument();
  });
});
