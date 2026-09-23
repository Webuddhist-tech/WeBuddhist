import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  VIEW_MODES,
  LAYOUT_MODES,
  SECTION_TITLE_MODES,
} from "@/routes/chapterV2/utils/header/view-selector/ViewSelector.tsx";
import {
  LAYOUT_MODE,
  SECTION_TITLE_MODE,
  siteName,
} from "@/utils/constants.ts";
import UseChapterHook from "./helpers/UseChapterHook.tsx";
import { useInfiniteQuery } from "react-query";
import { PanelProvider } from "@/context/PanelContext.tsx";
import {
  getEarlyReturn,
  getFirstSegment,
  getLastSegment,
  mergeSections,
} from "@/utils/helperFunctions.tsx";
import { getTextDetails } from "@/services/library";
import {
  hasTableOfContents,
  NO_TOC_HEADINGS,
  tocHeadingsBySegment,
  useTableOfContents,
} from "@/hooks/useTableOfContents.ts";
import { useTranslate } from "@tolgee/react";
import Seo from "@/routes/commons/seo/Seo.tsx";

const fetchContentDetails = async ({ pageParam = null, queryKey }: any) => {
  const [_, textId, , versionId, size, initialSegmentId] = queryKey;
  const segmentId = pageParam?.segmentId ?? initialSegmentId;
  return getTextDetails(textId, {
    ...(segmentId && { segment_id: segmentId }),
    // Paging already knows where it is, so pass the position too and the
    // library never has to scan the edition to locate the anchor segment.
    ...(pageParam?.position != null && {
      segment_position: pageParam.position,
    }),
    ...(versionId && { version_id: versionId }),
    direction: pageParam?.direction ?? "next",
    size,
  });
};

const transformLineBreaks = (content: string): string => {
  if (!content) return content;
  return content.replace(/⤵/g, "<br>");
};

const transformSectionsContent = (sections: any[]): any[] => {
  if (!sections) return sections;
  return sections.map((section) => ({
    ...section,
    segments: section.segments?.map((segment: any) => ({
      ...segment,
      content: transformLineBreaks(segment.content),
      translation: segment.translation
        ? {
            ...segment.translation,
            content: transformLineBreaks(segment.translation.content),
          }
        : segment.translation,
    })),
    sections: section.sections
      ? transformSectionsContent(section.sections)
      : section.sections,
  }));
};

const ContentsChapter = ({
  textId,
  contentId,
  segmentId,
  isFromSheet = false,
  versionId,
  addChapter,
  removeChapter,
  currentChapter,
  totalChapters,
  setVersionId,
}: any) => {
  const [viewMode, setViewMode] = useState(VIEW_MODES.SOURCE);
  const [layoutMode, setLayoutMode] = useState(() => {
    const stored = localStorage.getItem(LAYOUT_MODE);
    if (stored === LAYOUT_MODES.PROSE || stored === LAYOUT_MODES.SEGMENTED) {
      return stored;
    }
    return LAYOUT_MODES.SEGMENTED;
  });
  const [sectionTitleMode, setSectionTitleMode] = useState(() => {
    const stored = localStorage.getItem(SECTION_TITLE_MODE);
    return stored === SECTION_TITLE_MODES.HIDDEN
      ? SECTION_TITLE_MODES.HIDDEN
      : SECTION_TITLE_MODES.SHOWN;
  });
  const [currentSegmentId, setCurrentSegmentId] = useState(segmentId);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const size = 20;

  useEffect(() => {
    if (versionId) {
      setViewMode(VIEW_MODES.SOURCE_AND_TRANSLATIONS);
    } else {
      setViewMode(VIEW_MODES.SOURCE);
    }
  }, [versionId]);

  useEffect(() => {
    setCurrentSegmentId(segmentId);
  }, [segmentId]);
  const { t } = useTranslate();

  useEffect(() => {
    localStorage.setItem(LAYOUT_MODE, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem(SECTION_TITLE_MODE, sectionTitleMode);
  }, [sectionTitleMode]);

  // Fetched here rather than only inside the panel, because the header has to
  // know whether this text has a table of contents before it can decide to
  // offer the toggle. Same query key as the panel, so this costs no extra
  // request.
  const { data: tableOfContents } = useTableOfContents(textId);

  const infiniteQuery = useInfiniteQuery(
    ["content", textId, contentId, versionId, size, currentSegmentId],
    fetchContentDetails,
    {
      getNextPageParam: isFromSheet
        ? undefined
        : (lastPage) => {
            if (!lastPage?.has_more_down) return null;
            const last = getLastSegment(lastPage.content.sections);
            if (!last) return null;
            return {
              segmentId: last.segment_id,
              position: last.segment_number,
              direction: "next",
            };
          },
      getPreviousPageParam: isFromSheet
        ? undefined
        : (firstPage) => {
            if (!firstPage?.has_more_up) return null;
            const first = getFirstSegment(firstPage.content.sections);
            if (!first) return null;
            return {
              segmentId: first.segment_id,
              position: first.segment_number,
              direction: "previous",
            };
          },
      enabled: !!textId,
      refetchOnWindowFocus: false,
    },
  );

  // Merge all loaded sections for rendering
  const allContent = useMemo(() => {
    if (!infiniteQuery?.data?.pages || infiniteQuery.data.pages.length === 0)
      return null;
    let mergedSections: any[] = [];
    let text_detail = infiniteQuery.data.pages[0]?.text_detail;

    infiniteQuery.data.pages.forEach((page, index) => {
      mergedSections =
        index === 0
          ? page.content.sections
          : mergeSections(mergedSections, page.content.sections);
    });

    const transformedSections = transformSectionsContent(mergedSections);

    return {
      content: {
        ...infiniteQuery.data.pages[0].content,
        sections: transformedSections,
      },
      text_detail,
    };
  }, [infiniteQuery.data?.pages]);

  // Each section title keyed by the segment it begins at, so the reader can set
  // it down in the running text at the point the section starts.
  const sectionHeadings = useMemo(
    () =>
      sectionTitleMode === SECTION_TITLE_MODES.SHOWN && !isFromSheet
        ? tocHeadingsBySegment(tableOfContents)
        : NO_TOC_HEADINGS,
    [sectionTitleMode, tableOfContents, isFromSheet],
  );

  const handleSegmentNavigate = useCallback((newSegmentId: any) => {
    setCurrentSegmentId(newSegmentId);
    setScrollTrigger((prev) => prev + 1);
  }, []);

  const handleCurrentSectionChange = useCallback((sectionId: any) => {
    setCurrentSectionId(sectionId);
  }, []);

  // ----------------------------- helpers ---------------------------------------
  const siteBaseUrl = window.location.origin;
  const canonicalUrl = `${siteBaseUrl}${window.location.pathname}`;
  const pageTitle = allContent?.text_detail?.title
    ? `${allContent.text_detail.title} | ${siteName}`
    : `Chapter | ${siteName}`;
  const earlyReturn = getEarlyReturn({
    isLoading: infiniteQuery.isLoading,
    error: infiniteQuery.error,
    t,
  });
  if (earlyReturn) return earlyReturn;
  // Whether this text has an outline to offer at all: the resources panel lists
  // it, and the view menu offers to set its titles into the text. Sheets stay
  // out of both, being a pinned excerpt with paging turned off.
  const canShowTableOfContents =
    !isFromSheet && hasTableOfContents(tableOfContents);

  // ------------------------ renderers ----------------------
  const renderChapter = () => {
    const propsForUseChapterHookComponent = {
      textId,
      editionId: allContent?.content?.id,
      content: allContent?.content,
      language: allContent?.text_detail?.language,
      viewMode,
      layoutMode,
      addChapter,
      currentChapter,
      setVersionId,
      handleSegmentNavigate,
      infiniteQuery,
      onCurrentSectionChange: handleCurrentSectionChange,
      currentSectionId,
      currentSegmentId,
      scrollTrigger,
      textdetail: allContent?.text_detail,
      removeChapter,
      totalChapters,
      canShowTableOfContents,
      canShowSectionTitles: canShowTableOfContents,
      setViewMode,
      setLayoutMode,
      sectionTitleMode,
      setSectionTitleMode,
      sectionHeadings,
    };
    return <UseChapterHook {...propsForUseChapterHookComponent} />;
  };

  return (
    <div className="flex flex-col min-h-full">
      <Seo
        title={pageTitle}
        description="Read chapter content with source and translations."
        canonical={canonicalUrl}
      />
      <PanelProvider>{renderChapter()}</PanelProvider>
    </div>
  );
};

export default React.memo(ContentsChapter);
