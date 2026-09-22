import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { vi, describe, beforeEach, test, expect } from "vitest";
import UseChapterHook from "./UseChapterHook.js";
import "@testing-library/jest-dom";
import {
  VIEW_MODES,
  LAYOUT_MODES,
} from "../../utils/header/view-selector/ViewSelector.js";

const mockState = {
  panelContext: {
    isResourcesPanelOpen: false,
    openResourcesPanel: vi.fn(),
    closeResourcesPanel: vi.fn(),
  },
  intersectionObserver: {
    topSentinelInView: false,
    bottomSentinelInView: false,
  },
};

vi.mock("../../../../context/PanelContext.jsx", () => ({
  usePanelContext: () => mockState.panelContext,
}));

vi.mock("react-intersection-observer", () => ({
  useInView: vi.fn().mockImplementation(() => {
    const callCount = vi.fn().mock.calls.length;
    if (callCount === 0) {
      return {
        ref: vi.fn(),
        inView: mockState.intersectionObserver.topSentinelInView,
      };
    }
    return {
      ref: vi.fn(),
      inView: mockState.intersectionObserver.bottomSentinelInView,
    };
  }),
}));

vi.mock("../../utils/header/ChapterHeader.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="chapter-header-mock">ChapterHeader</div>,
}));

vi.mock("../../utils/resources/Resources.jsx", () => ({
  __esModule: true,
  default: ({ segmentId }: { segmentId: string }) => (
    <div data-testid="resources">Resources {segmentId}</div>
  ),
}));

vi.mock("../../../../utils/helperFunctions.jsx", () => ({
  getLanguageClass: (lang: string) => `lang-${lang}`,
  getCurrentSectionFromScroll: vi.fn(),
}));

const defaultProps: any = {
  content: {
    sections: [
      {
        id: "section-1",
        title: "Section 1",
        segments: [
          {
            segment_id: "seg1",
            segment_number: 1,
            content: "<span>Segment 1 Content</span>",
            translation: {
              language: "en",
              content: "<span>Translation 1</span>",
            },
          },
        ],
        sections: [],
      },
    ],
  },
  language: "bo",
  addChapter: vi.fn(),
  currentChapter: {},
  setVersionId: vi.fn(),
  infiniteQuery: {
    hasNextPage: false,
    hasPreviousPage: false,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
    fetchNextPage: vi.fn(),
    fetchPreviousPage: vi.fn(),
  },
  handleSegmentNavigate: vi.fn(),
  onCurrentSectionChange: vi.fn(),
};

const setup = (props: any = {}) => {
  return render(
    <UseChapterHook {...(defaultProps as any)} {...(props as any)} />,
  );
};

describe("UseChapterHook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.panelContext.isResourcesPanelOpen = false;
    mockState.panelContext.openResourcesPanel = vi.fn();
    mockState.panelContext.closeResourcesPanel = vi.fn();
    mockState.intersectionObserver.topSentinelInView = false;
    mockState.intersectionObserver.bottomSentinelInView = false;
  });

  test("renders main containers", () => {
    setup();
    expect(document.querySelector(".flex")).toBeInTheDocument();
  });

  test("draws no table-of-contents sidebar - the outline lives in the resources panel", () => {
    setup();
    expect(screen.queryByTestId("table-of-contents")).not.toBeInTheDocument();
  });

  test("renders section and segment content", () => {
    setup({ viewMode: VIEW_MODES.SOURCE });
    expect(screen.getByText("Segment 1 Content")).toBeInTheDocument();
  });

  test("renders loading indicators when fetching", () => {
    setup({
      infiniteQuery: {
        ...defaultProps.infiniteQuery,
        isFetchingNextPage: true,
      },
    });
    expect(screen.getByText("Loading more content...")).toBeInTheDocument();
  });

  test("renders loading indicators when fetching previous", () => {
    setup({
      infiniteQuery: {
        ...defaultProps.infiniteQuery,
        isFetchingPreviousPage: true,
      },
    });
    expect(screen.getByText("Loading previous content...")).toBeInTheDocument();
  });

  test("renders scroll sentinels when hasNextPage", () => {
    const { container } = setup({
      infiniteQuery: {
        ...defaultProps.infiniteQuery,
        hasNextPage: true,
      },
    });
    expect(container.querySelector(".h-5")).toBeInTheDocument();
  });

  test("renders scroll sentinels when hasPreviousPage", () => {
    const { container } = setup({
      infiniteQuery: {
        ...defaultProps.infiniteQuery,
        hasPreviousPage: true,
      },
    });
    expect(container.querySelector(".h-5")).toBeInTheDocument();
  });

  test("footnote marker click toggles active class", async () => {
    const { container } = setup({
      viewMode: VIEW_MODES.SOURCE,
      content: {
        sections: [
          {
            title: "Section 1",
            segments: [
              {
                segment_id: "seg1",
                segment_number: 1,
                content:
                  '<span><span class="footnote-marker">*</span><span class="footnote">Footnote</span></span>',
                translation: null,
              },
            ],
            sections: [],
          },
        ],
      },
    });

    const marker = container.querySelector(".footnote-marker");
    const footnote = marker?.nextElementSibling;

    expect(footnote).toBeInTheDocument();
    expect(footnote?.classList.contains("active")).toBe(false);
    fireEvent.click(marker as Element);
    expect(footnote?.classList.contains("active")).toBe(true);
  });

  test("does not render Resources when panel is closed", () => {
    mockState.panelContext.isResourcesPanelOpen = false;
    setup();
    expect(screen.queryByTestId("resources")).not.toBeInTheDocument();
  });

  test("renders Resources when panel is open and segment is selected", () => {
    mockState.panelContext.isResourcesPanelOpen = true;
    const { container } = setup();

    const segmentContainer = container.querySelector(".cursor-pointer");
    fireEvent.click(segmentContainer as Element);

    expect(screen.getByTestId("resources")).toBeInTheDocument();
    expect(screen.getByText("Resources seg1")).toBeInTheDocument();
  });

  test("handleSegmentClick opens resources panel", () => {
    const { container } = setup();

    const segmentContainer = container.querySelector(".cursor-pointer");
    fireEvent.click(segmentContainer as Element);

    expect(mockState.panelContext.openResourcesPanel).toHaveBeenCalled();
  });

  test("renders prose layout when layoutMode is PROSE", () => {
    const { container } = setup({
      viewMode: VIEW_MODES.SOURCE,
      layoutMode: LAYOUT_MODES.PROSE,
    });
    expect(container.querySelector(".leading-7")).toBeInTheDocument();
    expect(container.querySelector(".inline")).toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  test("scrolls to section when segment is selected", async () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = setup({
      currentSegmentId: null,
      scrollTrigger: 0,
    });

    rerender(
      <UseChapterHook
        {...defaultProps}
        currentSegmentId="seg1"
        scrollTrigger={1}
      />,
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });
  });

  test("handles keyboard navigation with Enter key in segmented layout", () => {
    const { container } = setup({
      viewMode: VIEW_MODES.SOURCE,
      layoutMode: LAYOUT_MODES.SEGMENTED,
    });

    const segmentContainer = container.querySelector(".cursor-pointer");
    fireEvent.keyDown(segmentContainer as Element, { key: "Enter" });

    expect(mockState.panelContext.openResourcesPanel).toHaveBeenCalled();
  });

  test("handles keyboard navigation with Space key in prose layout", () => {
    const { container } = setup({
      viewMode: VIEW_MODES.SOURCE,
      layoutMode: LAYOUT_MODES.PROSE,
    });

    const segmentSpan = container.querySelector(".inline.cursor-pointer");
    fireEvent.keyDown(segmentSpan as Element, { key: " " });

    expect(mockState.panelContext.openResourcesPanel).toHaveBeenCalled();
  });

  test("sets selectedSegmentId from currentChapter.segmentId", () => {
    mockState.panelContext.isResourcesPanelOpen = true;

    setup({
      currentChapter: { segmentId: "seg1" },
    });

    expect(screen.getByTestId("resources")).toBeInTheDocument();
    expect(screen.getByText("Resources seg1")).toBeInTheDocument();
  });
  describe("selecting a segment with a second reader open", () => {
    /**
     * Every reader pane after the first is opened by following a link from a
     * specific segment, so it always mounts with an anchor. The selection sync
     * used to depend on the selection itself, so it re-ran after every click and
     * put the highlight straight back on that anchor.
     */
    const twoSegments = {
      sections: [
        {
          id: "section-1",
          title: "Section 1",
          segments: [
            {
              segment_id: "seg1",
              segment_number: 1,
              content: "<span>First</span>",
            },
            {
              segment_id: "seg2",
              segment_number: 2,
              content: "<span>Second</span>",
            },
          ],
          sections: [],
        },
      ],
    };

    const openReader = (segmentId: string | null) =>
      setup({
        viewMode: VIEW_MODES.SOURCE,
        content: twoSegments,
        currentChapter: { segmentId },
        currentSegmentId: segmentId,
      });

    const clickSegment = (container: HTMLElement, index: number) =>
      fireEvent.click(container.querySelectorAll(".cursor-pointer")[index]);

    beforeEach(() => {
      mockState.panelContext.isResourcesPanelOpen = true;
    });

    test("a reader with no anchor can select a segment", () => {
      const { container } = openReader(null);

      clickSegment(container, 1);

      expect(screen.getByText("Resources seg2")).toBeInTheDocument();
    });

    test("a reader anchored on one segment can select another", () => {
      const { container } = openReader("seg2");

      // Starts on its anchor...
      expect(screen.getByText("Resources seg2")).toBeInTheDocument();

      // ...and clicking elsewhere moves it, instead of snapping back.
      clickSegment(container, 0);

      expect(screen.getByText("Resources seg1")).toBeInTheDocument();
    });

    test("the selection keeps moving across repeated clicks", () => {
      const { container } = openReader("seg1");

      clickSegment(container, 1);
      expect(screen.getByText("Resources seg2")).toBeInTheDocument();

      clickSegment(container, 0);
      expect(screen.getByText("Resources seg1")).toBeInTheDocument();
    });
  });
});
