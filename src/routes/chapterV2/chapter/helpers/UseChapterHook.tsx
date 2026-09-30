import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import ChapterHeader from "../../utils/header/ChapterHeader";
import {
  VIEW_MODES,
  LAYOUT_MODES,
} from "../../utils/header/view-selector/ViewSelector";
import { AUTO_SCROLL_SPEEDS } from "../../utils/header/AutoScrollControl";
import {
  getLanguageClass,
  getCurrentSectionFromScroll,
} from "../../../../utils/helperFunctions";
import { AUTO_SCROLL_SPEED } from "../../../../utils/constants";
import { usePanelContext } from "../../../../context/PanelContext";
import { useTransliteration } from "../../../../context/TransliterationContext";
import Resources from "../../utils/resources/Resources";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  groupSegmentsByHeading,
  NO_TOC_HEADINGS,
  type TocHeading,
} from "@/hooks/useTableOfContents.ts";
import { useYigchungReader } from "./useYigchungReader.ts";

/**
 * Weight for an inline section title, by how deep it sits in the outline.
 *
 * One hue at descending strength rather than grey, so a title reads as part of
 * the outline instead of as emphasised running text, and its depth is legible
 * where it stands in the text without the sidebar's indentation to place it.
 */
const HEADING_CLASSES = [
  "text-xl font-semibold text-toc-800",
  "text-lg font-semibold text-toc-700",
  "text-base font-medium text-toc-600",
  "text-sm font-medium text-toc-500",
];

type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
type LayoutMode = (typeof LAYOUT_MODES)[keyof typeof LAYOUT_MODES];

type Translation = {
  language: string;
  content: string;
};

type Segment = {
  segment_id: string;
  segment_number?: number;
  content: string;
  /** The edition's structural role for this segment, e.g. "verse", "title". */
  type?: string | null;
  /** The edition's own citation for this segment, e.g. "2-57". */
  reference?: string | null;
  translation?: Translation | null;
};

type Section = {
  id?: string;
  title?: string;
  segments?: Segment[];
  sections?: Section[];
};

type Content = {
  sections: Section[];
};

type TextDetail = {
  language?: string;
  [key: string]: unknown;
};

type ChapterMeta = {
  segmentId?: string;
  versionId?: string;
  [key: string]: unknown;
};

type InfiniteQueryControls = {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchingPreviousPage?: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
};

type PanelContextValue = {
  isResourcesPanelOpen: boolean;
  openResourcesPanel: () => void;
  closeResourcesPanel: () => void;
};

type UseChapterHookProps = {
  textId?: string;
  editionId?: string;
  content?: Content | null;
  language?: string;
  viewMode: ViewMode;
  layoutMode: LayoutMode;
  addChapter: (chapter: unknown) => void;
  currentChapter: ChapterMeta;
  setVersionId: (versionId: unknown) => void;
  handleSegmentNavigate: (segmentId: string) => void;
  infiniteQuery: InfiniteQueryControls;
  onCurrentSectionChange: (sectionId: string | null) => void;
  currentSectionId: string | null;
  currentSegmentId: string | null;
  scrollTrigger: number;
  textdetail?: TextDetail;
  removeChapter: (chapterId: unknown) => void;
  totalChapters: number;
  canShowSectionTitles: boolean;
  canShowTableOfContents: boolean;
  canShowYigchungs?: boolean;
  yigchungCount?: number;
  setViewMode: (mode: ViewMode) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  sectionTitleMode?: string;
  setSectionTitleMode?: (mode: string) => void;
  /** Section titles keyed by the segment each section begins at. */
  sectionHeadings?: Map<string, TocHeading[]>;
};

const UseChapterHook: React.FC<UseChapterHookProps> = (props) => {
  const {
    content,
    language,
    viewMode,
    layoutMode,
    addChapter,
    currentChapter,
    setVersionId,
    handleSegmentNavigate,
    infiniteQuery,
    onCurrentSectionChange,
    currentSectionId,
    textId,
    editionId,
    currentSegmentId,
    scrollTrigger,
    textdetail,
    removeChapter,
    totalChapters,
    canShowSectionTitles,
    canShowTableOfContents,
    canShowYigchungs = false,
    yigchungCount = 0,
    setViewMode,
    setLayoutMode,
    sectionTitleMode,
    setSectionTitleMode,
    sectionHeadings = NO_TOC_HEADINGS,
  } = props;

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { isResourcesPanelOpen, openResourcesPanel, closeResourcesPanel } =
    usePanelContext() as PanelContextValue;
  const {
    displayContent,
    transliterationBelow,
    contentClass,
    transliterationClass,
    isTransliterating,
    showsBelow,
  } = useTransliteration();
  const contentsContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    highlightedYigchungIndex,
    resourcesSubView,
    resourcesSubViewNonce,
    clearResourcesSubView,
    clearHighlightedYigchungIndex,
    contentsScrollClassName,
    bodyTextSizeClass,
  } = useYigchungReader({
    contentsContainerRef,
    canShowYigchungs,
    yigchungCount,
    selectSegmentId: setSelectedSegmentId,
    openResourcesPanel,
    isResourcesPanelOpen,
    layoutMode,
    contentSections: content?.sections,
  });
  const scrollRef = useRef({ isRestoring: false, previousScrollHeight: 0 });
  const sectionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const { ref: topSentinelRef, inView: isTopSentinelVisible } = useInView({
    threshold: 0.1,
    rootMargin: "50px",
  });
  const { ref: sentinelRef, inView: isBottomSentinelVisible } = useInView({
    threshold: 0.1,
    rootMargin: "50px",
  });
  const lastScrollTriggerRef = useRef(0);
  const {
    hasNextPage = false,
    hasPreviousPage = false,
    isFetchingNextPage = false,
    isFetchingPreviousPage = false,
    fetchNextPage,
    fetchPreviousPage,
  } = infiniteQuery;

  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(() => {
    const stored = Number(localStorage.getItem(AUTO_SCROLL_SPEED));
    return Object.values(AUTO_SCROLL_SPEEDS).includes(stored)
      ? stored
      : AUTO_SCROLL_SPEEDS.NORMAL;
  });
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollLastTsRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef(scrollSpeed);
  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  scrollSpeedRef.current = scrollSpeed;
  hasNextPageRef.current = hasNextPage;
  isFetchingNextPageRef.current = isFetchingNextPage;

  useEffect(() => {
    localStorage.setItem(AUTO_SCROLL_SPEED, String(scrollSpeed));
  }, [scrollSpeed]);

  useEffect(() => {
    if (!isAutoScrolling) {
      if (autoScrollFrameRef.current != null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
      autoScrollFrameRef.current = null;
      autoScrollLastTsRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      const container = contentsContainerRef.current;
      if (!container) {
        setIsAutoScrolling(false);
        return;
      }
      if (autoScrollLastTsRef.current == null) {
        autoScrollLastTsRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - autoScrollLastTsRef.current) / 1000;
      autoScrollLastTsRef.current = timestamp;
      container.scrollTop += scrollSpeedRef.current * deltaSeconds;

      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <=
        1;
      if (
        atBottom &&
        !hasNextPageRef.current &&
        !isFetchingNextPageRef.current
      ) {
        setIsAutoScrolling(false);
        return;
      }
      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoScrollFrameRef.current != null) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
      autoScrollFrameRef.current = null;
      autoScrollLastTsRef.current = null;
    };
  }, [isAutoScrolling]);

  useEffect(() => {
    const container = contentsContainerRef.current;
    if (!container || !isAutoScrolling) return;
    const handleStopAutoScroll = () => setIsAutoScrolling(false);
    container.addEventListener("wheel", handleStopAutoScroll, {
      passive: true,
    });
    container.addEventListener("touchstart", handleStopAutoScroll, {
      passive: true,
    });
    container.addEventListener("pointerdown", handleStopAutoScroll, {
      passive: true,
    });
    return () => {
      container.removeEventListener("wheel", handleStopAutoScroll);
      container.removeEventListener("touchstart", handleStopAutoScroll);
      container.removeEventListener("pointerdown", handleStopAutoScroll);
    };
  }, [isAutoScrolling]);

  useEffect(() => {
    setIsAutoScrolling(false);
  }, [currentSegmentId, textId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!content?.sections) return;
    const container = contentsContainerRef.current;
    const handleScroll = () => {
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const currentSection = getCurrentSectionFromScroll(
        content.sections,
        containerRect,
        sectionRefs,
      );
      currentSection && onCurrentSectionChange(currentSection);
    };
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [content?.sections, onCurrentSectionChange]);

  useEffect(() => {
    if (isBottomSentinelVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isBottomSentinelVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (isTopSentinelVisible && hasPreviousPage && !isFetchingPreviousPage) {
      const scrollContainer = contentsContainerRef.current;
      if (scrollContainer) {
        scrollRef.current.isRestoring = true;
        scrollRef.current.previousScrollHeight = scrollContainer.scrollHeight;
      }
      fetchPreviousPage();
    }
  }, [
    isTopSentinelVisible,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
  ]);

  useEffect(() => {
    if (currentChapter.segmentId) {
      setSelectedSegmentId(currentChapter.segmentId ?? null);
    }
  }, [currentChapter.segmentId]);

  // Select the segment this reader is anchored on: when it first opens, and
  // again whenever the resources panel navigates it somewhere else.
  //
  // Both of these must depend on the anchor alone. This one also depended on
  // selectedSegmentId (and compared against it), so it re-ran after every click
  // and put the highlight straight back on the anchor - meaning a reader opened
  // *on* a segment could never select a different one. That is every pane after
  // the first, since those are opened by following a link from a segment.
  useEffect(() => {
    if (currentSegmentId) {
      setSelectedSegmentId(currentSegmentId);
    }
  }, [currentSegmentId]);

  useEffect(() => {
    if (scrollTrigger === lastScrollTriggerRef.current) return;
    lastScrollTriggerRef.current = scrollTrigger;
    if (!currentSegmentId || !content?.sections) return;

    const container = contentsContainerRef.current;
    if (!container) return;

    setIsAutoScrolling(false);

    const findSectionWithSegment = (sections: Section[]): string | null => {
      for (const section of sections) {
        if (
          section.segments?.some((seg) => seg.segment_id === currentSegmentId)
        ) {
          return section.id ?? null;
        }
        if (section.sections?.length) {
          const found = findSectionWithSegment(section.sections);
          if (found) return found;
        }
      }
      return null;
    };

    const sectionId = findSectionWithSegment(content.sections);
    if (!sectionId) return;

    const sectionElement = sectionRefs.current.get(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentSegmentId, content?.sections, scrollTrigger]);

  useLayoutEffect(() => {
    const scrollContainer = contentsContainerRef.current;
    if (scrollContainer && scrollRef.current.isRestoring) {
      const newScrollHeight = scrollContainer.scrollHeight;
      const heightDifference =
        newScrollHeight - scrollRef.current.previousScrollHeight;
      scrollContainer.scrollTop += heightDifference;
      scrollRef.current.isRestoring = false;
    }
  }, [content]);

  const handleToggleAutoScroll = () => setIsAutoScrolling((prev) => !prev);

  // -------------------------- renderers --------------------------
  const renderChapterHeader = () => {
    const propsForChapterHeader = {
      viewMode,
      setViewMode,
      layoutMode,
      setLayoutMode,
      textdetail,
      removeChapter,
      currentChapter,
      totalChapters,
      currentSectionId,
      versionSelected: !!currentChapter.versionId,
      canShowSectionTitles,
      editionId,
      isAutoScrolling,
      onToggleAutoScroll: handleToggleAutoScroll,
      scrollSpeed,
      setScrollSpeed,
      sectionTitleMode,
      setSectionTitleMode,
    };
    return <ChapterHeader {...propsForChapterHeader} />;
  };

  const renderLoadingIndicator = (message: string) => (
    <div className="loading-indicator flex justify-center w-full">
      <p>{message}</p>
    </div>
  );

  const renderScrollSentinelTop = () => {
    if (!hasPreviousPage || isFetchingPreviousPage) {
      return null;
    }
    return (
      <div
        ref={topSentinelRef}
        className="h-5 w-full opacity-0 pointer-events-none"
      />
    );
  };

  const renderScrollSentinelBottom = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return null;
    }
    return (
      <div
        ref={sentinelRef}
        className="h-5 w-full opacity-0 pointer-events-none"
      />
    );
  };

  const handleSegmentClick = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    openResourcesPanel();
  };

  const createSegmentControlHandlers = (segmentId: string) => {
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      if ((event.target as HTMLElement).closest(".footnote-marker")) return;
      handleSegmentClick(segmentId);
    };
    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleSegmentClick(segmentId);
    };
    return { handleClick, handleKeyDown };
  };

  const renderProseTransliteration = (segments: Segment[]) => {
    if (!showsBelow) return null;
    if (
      viewMode !== VIEW_MODES.SOURCE &&
      viewMode !== VIEW_MODES.SOURCE_AND_TRANSLATIONS
    ) {
      return null;
    }
    const lines = segments.map((segment) => ({
      id: segment.segment_id,
      html: transliterationBelow(segment.content),
    }));
    // Every segment was already in the chosen script, so a second paragraph
    // would just repeat the first.
    if (!lines.some((line) => line.html)) return null;
    return (
      <p
        className={`m-0 mt-2 leading-7 text-justify text-[0.95em] text-[#555] ${transliterationClass}`}
      >
        {lines.map((line) => (
          <span
            key={line.id}
            className="mr-0.5 inline"
            dangerouslySetInnerHTML={{ __html: line.html }}
          />
        ))}
      </p>
    );
  };

  const languageClass = contentClass(language || "en");

  const segmentResourcesButtonClassName =
    "sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-20 focus:rounded focus:border focus:border-slate-300 focus:bg-white focus:px-2 focus:py-1 focus:text-xs focus:font-medium focus:text-[#102544]";

  const renderSegmentResourcesButton = (
    segmentId: string,
    segmentLabel: string,
  ) => (
    <button
      type="button"
      className={segmentResourcesButtonClassName}
      aria-label={segmentLabel}
      onClick={(event) => {
        event.stopPropagation();
        handleSegmentClick(segmentId);
      }}
    />
  );

  const renderProseSegment = (segment: Segment) => {
    const isSelected = selectedSegmentId === segment.segment_id;
    const { handleClick, handleKeyDown } = createSegmentControlHandlers(
      segment.segment_id,
    );
    const segmentLabel = segment.reference
      ? `Open resources for segment ${segment.reference}`
      : "Open resources for this segment";
    const proseClassName = `inline cursor-pointer ${bodyTextSizeClass} mr-0.5 text-left ${
      isSelected && "bg-blue-50"
    }`;
    const proseBody = (
      <>
        {(viewMode === VIEW_MODES.SOURCE ||
          viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
          <span
            className={languageClass}
            dangerouslySetInnerHTML={{
              __html: displayContent(segment.content),
            }}
          />
        )}
        {segment.translation &&
          (viewMode === VIEW_MODES.TRANSLATIONS ||
            viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
            <span
              className={getLanguageClass(segment.translation.language || "en")}
              dangerouslySetInnerHTML={{
                __html: segment.translation.content,
              }}
            />
          )}
      </>
    );

    if (canShowYigchungs) {
      return (
        <span
          key={segment.segment_id}
          data-segment-id={segment.segment_id}
          className="relative mr-0.5 inline align-baseline"
        >
          {renderSegmentResourcesButton(segment.segment_id, segmentLabel)}
          <span className={proseClassName} onClick={handleClick}>
            {proseBody}
          </span>
        </span>
      );
    }

    return (
      <button
        type="button"
        key={segment.segment_id}
        data-segment-id={segment.segment_id}
        className={`${proseClassName} border-0 bg-transparent p-0 font-inherit text-inherit`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={segmentLabel}
      >
        {proseBody}
      </button>
    );
  };

  const renderSegmentedSegment = (segment: Segment) => {
    const isSelected = selectedSegmentId === segment.segment_id;
    const below = transliterationBelow(segment.content);
    const { handleClick, handleKeyDown } = createSegmentControlHandlers(
      segment.segment_id,
    );
    const segmentLabel = segment.reference
      ? `Open resources for segment ${segment.reference}`
      : "Open resources for this segment";
    const segmentedBody = (
      <>
        <div className="md:mr-4 flex shrink-0 flex-col items-start">
          <p className="text-xs" title={`#${segment.segment_number}`}>
            {segment.reference}
          </p>
        </div>
        <div
          className={`flex flex-col items-start ${bodyTextSizeClass} w-full text-justify ${isSelected && "bg-blue-50"}`}
        >
          {(viewMode === VIEW_MODES.SOURCE ||
            viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
            <p
              className={`${languageClass} whitespace-pre-line`}
              dangerouslySetInnerHTML={{
                __html: displayContent(segment.content),
              }}
            />
          )}
          {below &&
            (viewMode === VIEW_MODES.SOURCE ||
              viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
              <p
                className={`${transliterationClass} whitespace-pre-line text-[0.95em] text-[#555]`}
                dangerouslySetInnerHTML={{ __html: below }}
              />
            )}
          {segment.translation &&
            (viewMode === VIEW_MODES.TRANSLATIONS ||
              viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
              <p
                className={`${getLanguageClass(
                  segment.translation.language || "en",
                )} whitespace-pre-line`}
                dangerouslySetInnerHTML={{
                  __html: segment.translation.content,
                }}
              />
            )}
        </div>
      </>
    );

    if (canShowYigchungs) {
      return (
        <div
          key={segment.segment_id}
          data-segment-id={segment.segment_id}
          className="relative mt-2.5 flex w-[700px] max-w-full items-baseline gap-4 text-left"
          title={`#${segment.reference}_${segment.type}`}
        >
          {renderSegmentResourcesButton(segment.segment_id, segmentLabel)}
          <div
            className="flex cursor-pointer flex-1 items-baseline gap-4"
            onClick={handleClick}
          >
            {segmentedBody}
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        key={segment.segment_id}
        data-segment-id={segment.segment_id}
        className="cursor-pointer flex items-baseline mt-2.5 w-[700px] max-w-full gap-4 border-0 bg-transparent p-0 font-inherit text-inherit text-left"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={`#${segment.reference}_${segment.type}`}
        aria-label={segmentLabel}
      >
        {segmentedBody}
      </button>
    );
  };

  /**
   * The section titles that open a run of text.
   *
   * A chapter, its first part and that part's first subsection can all begin at
   * the same words, so several titles stack here; they arrive outermost first
   * and lose weight with depth, which is what makes the nesting legible without
   * numbering. The rule above separates one section from the end of the last,
   * and is skipped at the top of a page where there is nothing to separate from.
   */
  const renderSectionHeadings = (headings: TocHeading[], index: number) => {
    if (headings.length === 0) return null;
    return (
      <div
        className={`w-[700px] max-w-full text-center ${
          index === 0 ? "mt-2" : "mt-10 border-t border-gray-200 pt-8"
        }`}
      >
        {headings.map((heading) => (
          <p
            key={heading.id}
            className={`mb-4 ${languageClass} ${
              HEADING_CLASSES[
                Math.min(heading.depth, HEADING_CLASSES.length - 1)
              ]
            }`}
          >
            {displayContent(heading.title)}
          </p>
        ))}
      </div>
    );
  };

  const renderSectionRecursive = (section: Section | undefined) => {
    if (!section) return null;
    const isProse = layoutMode === LAYOUT_MODES.PROSE;
    const groups = groupSegmentsByHeading(section.segments, sectionHeadings);
    // Section headings are set in English by default; once the text is
    // replaced they need the target script's face instead.
    const titleClass =
      isTransliterating && !showsBelow
        ? contentClass(language)
        : getLanguageClass("en");
    return (
      <div
        className="flex flex-col items-center w-full"
        key={section.title || "root"}
        ref={(sectionRef) => {
          sectionRef &&
            section.id &&
            sectionRefs.current.set(section.id, sectionRef);
        }}
      >
        {section.title && (
          <h2
            className={` ${titleClass} w-fit border-b-2 border-zinc-500 p-2 text-lg`}
          >
            {displayContent(section.title)}
          </h2>
        )}
        <div
          className={`flex flex-col w-full px-2.5 items-center mx-auto ${isProse && "block max-w-[700px]"}`}
        >
          {isProse
            ? groups.map((group, index) => (
                <React.Fragment key={group.key}>
                  {renderSectionHeadings(group.headings, index)}
                  <p className={`${bodyTextSizeClass} text-justify m-0`}>
                    {group.segments.map(renderProseSegment)}
                  </p>
                  {/* Prose runs segments together, so a line under each one
                      would break the paragraph. The transliteration follows as
                      a second paragraph instead, reading in the same order. */}
                  {renderProseTransliteration(group.segments)}
                </React.Fragment>
              ))
            : groups.map((group, index) => (
                <React.Fragment key={group.key}>
                  {renderSectionHeadings(group.headings, index)}
                  {group.segments.map(renderSegmentedSegment)}
                </React.Fragment>
              ))}

          {section.sections?.map((nestedSection) =>
            renderSectionRecursive(nestedSection),
          )}
        </div>
      </div>
    );
  };

  const renderContents = () => {
    if (!content?.sections || content.sections.length === 0) return null;

    return (
      <div className="w-full">
        {renderScrollSentinelTop()}
        {isFetchingPreviousPage &&
          renderLoadingIndicator("Loading previous content...")}
        {content.sections.map((section) => renderSectionRecursive(section))}
        {isFetchingNextPage &&
          renderLoadingIndicator("Loading more content...")}
        {renderScrollSentinelBottom()}
      </div>
    );
  };

  const renderResources = () => {
    if (!selectedSegmentId) return null;

    return (
      <Resources
        segmentId={selectedSegmentId}
        addChapter={addChapter}
        handleClose={closeResourcesPanel}
        currentChapter={currentChapter}
        setVersionId={setVersionId}
        handleSegmentNavigate={handleSegmentNavigate}
        textId={textId}
        canShowTableOfContents={canShowTableOfContents}
        canShowYigchungs={canShowYigchungs}
        highlightedYigchungIndex={highlightedYigchungIndex}
        resourcesSubView={resourcesSubView}
        resourcesSubViewNonce={resourcesSubViewNonce}
        onResourcesSubViewApplied={clearResourcesSubView}
        onClearYigchungHighlight={clearHighlightedYigchungIndex}
      />
    );
  };

  const renderMobileLayout = () => {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden min-h-0">
        {isResourcesPanelOpen && selectedSegmentId ? (
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={55} minSize={30}>
              <div className="flex flex-col w-full h-full overflow-hidden">
                {renderChapterHeader()}
                <div
                  className={contentsScrollClassName}
                  ref={contentsContainerRef}
                >
                  {renderContents()}
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={20}>
              {renderResources()}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            {renderChapterHeader()}
            <div className={contentsScrollClassName} ref={contentsContainerRef}>
              {renderContents()}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDesktopLayout = () => {
    return (
      <div className="flex flex-col w-full h-full overflow-hidden min-h-0">
        {renderChapterHeader()}
        <div className={contentsScrollClassName} ref={contentsContainerRef}>
          {renderContents()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full min-h-full flex-1">
      <div className="flex w-full h-full min-h-0">
        {isMobile ? renderMobileLayout() : renderDesktopLayout()}

        {!isMobile && isResourcesPanelOpen && renderResources()}
      </div>
    </div>
  );
};

export default React.memo(UseChapterHook);
