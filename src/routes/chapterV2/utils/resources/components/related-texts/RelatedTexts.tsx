import { GoLinkExternal } from "react-icons/go";
import { useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import { usePanelContext } from "../../../../../../context/PanelContext.tsx";
import { getLanguageClass } from "../../../../../../utils/helperFunctions.tsx";
import TextExpand from "../../../../../commons/expandtext/TextExpand.tsx";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";
import SegmentTypeLabel from "../common/SegmentTypeLabel.tsx";
import { getSegmentCommentaries } from "@/services/library";

export const fetchCommentaryData = async (
  segment_id: string,
  skip = 0,
  limit = 10,
) => {
  return getSegmentCommentaries({ segmentId: segment_id, skip, limit });
};
const CommentaryView = ({
  segmentId,
  setIsCommentaryView,
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
    data: segmentCommentaries,
    isLoading,
    error,
  } = useQuery(
    ["relatedTexts", segmentId],
    () => fetchCommentaryData(segmentId),
    {
      refetchOnWindowFocus: false,
    },
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ResourceHeader
        title={`${t("text.commentary")}${segmentCommentaries?.commentaries?.length ? ` (${segmentCommentaries.commentaries.length})` : ""}`}
        onBack={handleNavigate}
        onClose={() => setIsCommentaryView("main")}
      />
      <div className="flex-1 overflow-y-auto text-left p-4 text-gray-900">
        <ResourceState
          isLoading={isLoading}
          isError={error}
          isEmpty={(segmentCommentaries?.commentaries?.length ?? 0) === 0}
        >
          <div className="space-y-4">
            {segmentCommentaries?.commentaries?.map((commentary: any) => {
              const textId = commentary.text_id;
              return (
                <div key={textId}>
                  {/* The heading is a group's only identifier, and it carries
                      the segment count too, so a text whose metadata could not
                      be fetched says so rather than losing its heading and
                      leaving stacks of segments no one can tell apart. */}
                  <h3
                    className={` my-2 border-b-2 border-red-700 pb-3 text-lg font-semibold  text-gray-800 ${getLanguageClass(
                      commentary.language,
                    )}`}
                  >
                    {commentary.title || t("connection_panel.untitled_text")}
                    {commentary.segments?.length > 1
                      ? ` (${commentary.segments.length})`
                      : ""}
                  </h3>
                  {commentary.segments && (
                    <div className="space-y-4">
                      {commentary.segments &&
                        commentary.segments.map((item: any, idx: number) => (
                          <div key={`${textId}-${idx}`} className="space-y-2">
                            <SegmentTypeLabel type={item.type} />
                            <TextExpand
                              language={commentary.language}
                              maxLength={250}
                            >
                              {item.content}
                            </TextExpand>
                            <div className="flex">
                              <button
                                type="button"
                                className="flex space-x-2 items-center text-sm text-gray-600 transition hover:text-red-700 cursor-pointer"
                                onClick={() => handleOpenText(textId, item.id)}
                              >
                                <GoLinkExternal />
                                <span>{t("text.translation.open_text")}</span>
                              </button>
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
  );
};

export default CommentaryView;
