import { useTranslate } from "@tolgee/react";
import { GoLinkExternal } from "react-icons/go";
import { useQuery } from "react-query";
import { usePanelContext } from "../../../../../../context/PanelContext.tsx";
import { getLanguageClass } from "../../../../../../utils/helperFunctions.tsx";
import { useLanguageLabel } from "@/context/LanguagesContext.tsx";
import TextExpand from "../../../../../commons/expandtext/TextExpand.tsx";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getSegmentTranslations } from "@/services/library";

export const fetchTranslationsData = async (
  segment_id: string,
  skip = 0,
  limit = 10,
) => {
  return getSegmentTranslations({ segmentId: segment_id, skip, limit });
};

const TranslationView = ({
  segmentId,
  setIsTranslationView,
  addChapter,
  currentChapter,
  setVersionId,
  handleNavigate,
}: any) => {
  const { t } = useTranslate();
  const languageLabel = useLanguageLabel();
  const { closeResourcesPanel } = usePanelContext() as any;

  const handleOpenText = (targetTextId: string, targetSegmentId: string) => {
    addChapter(
      { textId: targetTextId, segmentId: targetSegmentId },
      currentChapter,
    );
    closeResourcesPanel();
  };

  const {
    data: sidePanelTranslationsData,
    isLoading,
    error,
  } = useQuery(
    ["sidePanelTranslations", segmentId],
    () => fetchTranslationsData(segmentId),
    {
      refetchOnWindowFocus: false,
    },
  );

  const groupedTranslations = sidePanelTranslationsData?.translations?.reduce(
    (acc: any, translation: any) => {
      if (!acc[translation.language]) {
        acc[translation.language] = [];
      }
      acc[translation.language].push(translation);
      return acc;
    },
    {},
  );

  const renderTranslationItem = (
    translation: any,
    _language: string,
    index: number,
  ) => {
    return (
      <div key={index} className="mb-2 rounded-md">
        <div className="flex items-center justify-between">
          {translation.title && (
            <p
              className={` py-4 font-semibold ${getLanguageClass(translation.language)}`}
            >
              {translation.title}
            </p>
          )}
          <Badge
            asChild
            variant="outline"
            className=" cursor-pointer text-xs rounded-sm "
          >
            <Button
              variant="ghost"
              className="flex items-center text-blue-500 "
              onClick={() => setVersionId(translation.text_id)}
            >
              {translation.text_id === sessionStorage.getItem("versionId")
                ? t("text.translation.current_selected")
                : t("common.select")}
            </Button>
          </Badge>
        </div>

        {translation.source_link && (
          <div
            className={`text-sm space-y-1 ${getLanguageClass(
              translation.language,
            )}`}
          >
            <p className="overalltext">
              {t("connection_panel.menuscript.source")}:
              <span className={`${getLanguageClass("en")} text-sm`}>
                {translation.source_link}
              </span>
            </p>
          </div>
        )}

        {translation.segments?.map((item: any, idx: number) => (
          <div key={idx} className="mt-3 space-y-2">
            <TextExpand language={translation.language} maxLength={250}>
              {item.content}
            </TextExpand>
            <div className="flex min-h-10 items-center justify-between overalltext">
              {addChapter && (
                <Button
                  variant="secondary"
                  onClick={() => handleOpenText(translation.text_id, item.id)}
                >
                  <GoLinkExternal />
                  {t("text.translation.open_text")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <ResourceHeader
        title={t("connection_pannel.translations")}
        onBack={handleNavigate}
        onClose={() => setIsTranslationView("main")}
      />

      <div className=" flex-1 overflow-y-auto p-4 text-left text-black">
        <ResourceState
          isLoading={isLoading}
          isError={error}
          isEmpty={Object.keys(groupedTranslations ?? {}).length === 0}
        >
          <div className="space-y-4">
            {groupedTranslations &&
              Object.entries(groupedTranslations).map(
                ([language, translations]: any) => (
                  <div key={language}>
                    <h3 className="overalltext mb-3 flex items-center gap-1 border-b-2 border-[#C74444] text-[#7d7d7d]">
                      {languageLabel(language)}
                      <span className="ml-1 text-sm text-[#718096]">
                        ({translations.length})
                      </span>
                    </h3>
                    {translations.map((translation: any, index: number) =>
                      renderTranslationItem(translation, language, index),
                    )}
                  </div>
                ),
              )}
          </div>
        </ResourceState>
      </div>
    </div>
  );
};

export default TranslationView;
