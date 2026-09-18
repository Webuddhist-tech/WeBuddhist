import { GoLinkExternal } from "react-icons/go";
import { useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import { useEffect } from "react";
import { usePanelContext } from "../../../../../../context/PanelContext.tsx";
import { getLanguageClass } from "../../../../../../utils/helperFunctions.tsx";
import TextExpand from "../../../../../commons/expandtext/TextExpand.tsx";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";
import SegmentTypeLabel from "../common/SegmentTypeLabel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getSegmentRootText } from "@/services/library";

export const fetchRootTextData = async (segment_id: string) => {
  return getSegmentRootText({ segmentId: segment_id });
};

const RootTextView = ({
  segmentId,
  setIsRootTextView,
  addChapter,
  currentChapter,
  handleNavigate,
}: any) => {
  const { t } = useTranslate();
  const { closeResourcesPanel } = usePanelContext() as any;

  const handleOpenText = (targetTextId: string, targetSegmentId: string) => {
    addChapter(
      { textId: targetTextId, segmentId: targetSegmentId },
      currentChapter,
    );
    closeResourcesPanel();
  };

  const {
    data: rootTextData,
    isLoading,
    error,
  } = useQuery(["rootTexts", segmentId], () => fetchRootTextData(segmentId), {
    refetchOnWindowFocus: false,
  });

  const handleFootnoteClick = (event: any) => {
    if (event.target.classList?.contains("footnote-marker")) {
      event.stopPropagation();
      event.preventDefault();
      const footnoteMarker = event.target;
      const footnote = footnoteMarker.nextElementSibling;

      if (footnote?.classList.contains("footnote")) {
        footnote.classList.toggle("active");
      }
      return false;
    }
  };

  useEffect(() => {
    const rootTextElement = document.querySelector(".root-texts-list");
    if (rootTextElement) {
      rootTextElement.addEventListener("click", handleFootnoteClick);
    }

    return () => {
      const rootTextElement = document.querySelector(".root-texts-list");
      if (rootTextElement) {
        rootTextElement.removeEventListener("click", handleFootnoteClick);
      }
    };
  }, [rootTextData]);

  return (
    <div className="flex h-full flex-col">
      <ResourceHeader
        title={`${t("text.root_text")}${rootTextData?.root_text?.length ? ` (${rootTextData.root_text.length})` : ""}`}
        onBack={handleNavigate}
        onClose={() => setIsRootTextView("main")}
      />
      <div className="flex-1 overflow-y-auto p-4 text-left text-black">
        <div className=" [&_.footnote-marker]:cursor-pointer [&_.footnote-marker]:px-0.5 [&_.footnote-marker]:text-xs [&_.footnote-marker]:font-semibold [&_.footnote-marker]:text-blue-600 [&_.footnote-marker]:transition-colors [&_.footnote-marker]:duration-200 hover:[&_.footnote-marker]:text-blue-800 [&_.footnote]:hidden [&_.footnote]:rounded [&_.footnote]:bg-gray-100 [&_.footnote]:px-1.5 [&_.footnote]:py-0.5 [&_.footnote]:text-[0.9em] [&_.footnote]:italic [&_.footnote]:text-[#8a8a8a] [&_.footnote.active]:inline">
          <ResourceState
            isLoading={isLoading}
            isError={error}
            isEmpty={(rootTextData?.root_text?.length ?? 0) === 0}
          >
            <div>
              {rootTextData?.root_text?.map((rootText: any) => {
                const textId = rootText.text_id;
                const language = rootText.language;
                return (
                  <div key={textId}>
                    {/* A text whose metadata could not be fetched has no
                        title. Rendering the heading anyway left an empty
                        bordered bar above the segments. */}
                    {rootText.title && (
                      <h3
                        className={` my-2 border-b-2 border-[#a70c0c] pb-3 text-lg font-semibold  text-[#333] ${getLanguageClass(
                          language,
                        )}`}
                      >
                        {rootText.title}{" "}
                        {rootText.segments?.length > 1
                          ? `(${rootText.segments.length})`
                          : ""}
                      </h3>
                    )}
                    {rootText.segments && (
                      <div className="space-y-2">
                        {rootText.segments &&
                          rootText.segments.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <SegmentTypeLabel type={item.type} />
                              <TextExpand language={language} maxLength={250}>
                                {item.content}
                              </TextExpand>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  className="flex items-center gap-1 bg-transparent p-0 text-sm text-[#555] hover:text-[#a70c0c]"
                                  onClick={() =>
                                    handleOpenText(textId, item.id)
                                  }
                                >
                                  <GoLinkExternal size={14} className="mr-1" />
                                  <span>{t("text.translation.open_text")}</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ResourceState>
        </div>
      </div>
    </div>
  );
};

export default RootTextView;
