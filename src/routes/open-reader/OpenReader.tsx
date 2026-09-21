import { useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { VIEW_MODES } from "@/routes/chapterV2/utils/header/view-selector/ViewSelector.tsx";
import { siteName, PLAY_STORE_URL, APP_STORE_URL } from "@/utils/constants.ts";
import { useInfiniteQuery } from "react-query";
import { PanelProvider } from "@/context/PanelContext.tsx";
import {
  getEarlyReturn,
  mergeSections,
  getLanguageClass,
  getLastSegment,
} from "@/utils/helperFunctions.tsx";
import { getTextDetails } from "@/services/library";
import { useTranslate } from "@tolgee/react";
import Seo from "@/routes/commons/seo/Seo.tsx";

const fetchContentDetails = async ({ pageParam = null, queryKey }: any) => {
  const [_, textId, size, initialSegmentId] = queryKey;
  const segmentId = pageParam?.segmentId ?? initialSegmentId;
  return getTextDetails(textId, {
    ...(segmentId && { segment_id: segmentId }),
    ...(pageParam?.position != null && {
      segment_position: pageParam.position,
    }),
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

type Segment = {
  segment_id: string;
  segment_number?: number;
  content: string;
  /** The edition's structural role for this segment, e.g. "verse", "title". */
  type?: string | null;
  /** The edition's own citation for this segment, e.g. "2-57". */
  reference?: string | null;
  translation?: { language: string; content: string } | null;
};

type Section = {
  id?: string;
  title?: string;
  segments?: Segment[];
  sections?: Section[];
};

const OpenReader = () => {
  const { textId } = useParams<{ textId: string }>();
  const [searchParams] = useSearchParams();
  const sharedSegmentId = searchParams.get("segment");

  const [viewMode] = useState(VIEW_MODES.SOURCE);
  const size = 20;
  const { t } = useTranslate();

  const infiniteQuery = useInfiniteQuery(
    ["content", textId, size, sharedSegmentId],
    fetchContentDetails,
    {
      getNextPageParam: (lastPage) => {
        if (!lastPage?.has_more_down) return null;
        const last = getLastSegment(lastPage.content.sections);
        if (!last) return null;
        return {
          segmentId: last.segment_id,
          position: last.segment_number,
          direction: "next",
        };
      },
      enabled: !!textId,
      refetchOnWindowFocus: false,
    },
  );

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

  const language = allContent?.text_detail?.language || "bo";
  const languageClass = getLanguageClass(language);

  const renderSegment = (segment: Segment, isShared: boolean) => {
    return (
      <div
        key={segment.segment_id}
        className={`flex items-baseline mt-2.5 w-[700px] max-w-full gap-4 ${
          !isShared ? "blur-sm select-none pointer-events-none" : ""
        }`}
        title={`#${segment.reference}_${segment.type}`}
      >
        <div className="md:mr-4 flex shrink-0 flex-col items-start text-gray-700">
          <p className="text-xs" title={`#${segment.segment_number}`}>
            {segment.reference}
          </p>
        </div>
        <div className="flex flex-col items-start text-lg w-full text-justify">
          {(viewMode === VIEW_MODES.SOURCE ||
            viewMode === VIEW_MODES.SOURCE_AND_TRANSLATIONS) && (
            <p
              className={`${languageClass} whitespace-pre-line`}
              dangerouslySetInnerHTML={{ __html: segment.content }}
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
      </div>
    );
  };

  const renderSection = (section: Section) => {
    if (!section) return null;

    return (
      <div
        className="flex flex-col items-center w-full"
        key={section.id || section.title || "root"}
      >
        <div className="flex flex-col w-full px-2.5 items-center mx-auto">
          {section.segments?.map((segment) => {
            const isShared = segment.segment_id === sharedSegmentId;
            return renderSegment(segment, isShared);
          })}
          {section.sections?.map((nestedSection) =>
            renderSection(nestedSection),
          )}
        </div>
      </div>
    );
  };

  const hasSharedSegment = sharedSegmentId && allContent?.content?.sections;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Seo
        title={pageTitle}
        description="Read chapter content with source and translations."
        canonical={canonicalUrl}
      />

      {/* Title bar */}
      <div className="border-b border-gray-200 px-4 py-3 text-center">
        <h1 className="text-lg font-medium">
          {allContent?.text_detail?.title || "Loading..."}
        </h1>
      </div>

      {/* Content with blur overlay */}
      <div className="relative flex-1">
        <PanelProvider>
          <div className="flex flex-col w-full px-4 pt-6">
            {allContent?.content?.sections?.map((section: Section) =>
              renderSection(section),
            )}
          </div>
        </PanelProvider>

        {/* Overlay for non-shared segments */}
        {hasSharedSegment && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute left-0 right-0 top-24 bottom-0 pointer-events-auto"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 20%)",
              }}
            >
              <div className="flex flex-col items-center pt-32">
                <p className="text-gray-600 mb-4">
                  Download the app to read the full text.
                </p>
                <div className="flex gap-4">
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                      alt="Get it on Google Play"
                      className="h-10"
                    />
                  </a>
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                      alt="Download on the App Store"
                      className="h-10"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenReader;
