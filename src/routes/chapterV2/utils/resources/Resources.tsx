import { useQuery } from "react-query";
import { IoLanguage, IoNewspaperOutline } from "react-icons/io5";
import { BiSearch, BiBookOpen } from "react-icons/bi";
import { LuList } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa6";
import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import ShareView from "./components/share-view/ShareView.tsx";
import TranslationView from "./components/translation-view/TranslationView.tsx";
import CommentaryView from "./components/related-texts/RelatedTexts.tsx";
import RootTextView from "./components/root-texts/RootText.tsx";
import { usePanelContext } from "../../../../context/PanelContext.tsx";
import { MENU_ITEMS } from "../../../../utils/constants.ts";
import IndividualTextSearch from "./components/individual-text-search/IndividualTextSearch.tsx";
import { Button } from "@/components/ui/button";
import ResourceHeader from "./components/common/ResourceHeader.tsx";
import CompareText from "./components/compare-text/CompareText.tsx";
import TableOfContentsView from "./components/table-of-contents/TableOfContentsView.tsx";
import ContributorsView, {
  useTextContributors,
} from "./components/contributors-view/ContributorsView.tsx";
import { getSegmentInfo } from "@/services/library";

type PanelContextValue = {
  isResourcesPanelOpen: boolean;
  closeResourcesPanel: () => void;
};

export const fetchSidePanelData = async (segmentId: string) => {
  return getSegmentInfo(segmentId);
};

const Resources = ({
  segmentId,
  addChapter,
  handleClose,
  currentChapter,
  setVersionId,
  handleSegmentNavigate,
  textId,
  canShowTableOfContents = false,
}: any) => {
  const { isResourcesPanelOpen, closeResourcesPanel } =
    usePanelContext() as PanelContextValue;
  const showPanel = isResourcesPanelOpen;
  const [activeView, setActiveView] = useState("main");
  const { t } = useTranslate();
  const storedLanguage = localStorage.getItem("language");

  const { data: sidePanelData } = useQuery(
    ["sidePanel", segmentId],
    () => fetchSidePanelData(segmentId),
    {
      refetchOnWindowFocus: false,
    },
  );

  const handleClosePanel = () => {
    handleClose ? handleClose() : closeResourcesPanel();
    setActiveView("main");
  };

  // The segment's own text, which for a translation is not the text the reader
  // opened, so the credits follow what they actually selected.
  const segmentTextId = sidePanelData?.segment_info?.text_id ?? textId;
  const { data: contributors } = useTextContributors(segmentTextId);

  const counts = {
    translations: sidePanelData?.segment_info?.translations ?? 0,
    commentaries: sidePanelData?.segment_info?.related_text?.commentaries ?? 0,
    rootTexts: sidePanelData?.segment_info?.related_text?.root_text ?? 0,
    sheets: sidePanelData?.segment_info?.resources?.sheets ?? 0,
    contributors: contributors?.length ?? 0,
  };

  const renderTranslationsSection = () =>
    counts.translations > 0 && (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setActiveView("translation")}
        className="w-full flex justify-start gap-1.5"
      >
        <IoLanguage className="text-lg" />
        {`${t("connection_pannel.translations")} (${counts.translations})`}
      </Button>
    );

  const renderCommentaryButton = () =>
    counts.commentaries > 0 && (
      <Button
        type="button"
        variant="ghost"
        className="w-full flex justify-start gap-1.5"
        onClick={() => setActiveView("commentary")}
      >
        <BiBookOpen className="text-lg" />
        {`${t("text.commentary")} (${counts.commentaries})`}
      </Button>
    );

  const renderRootTextButton = () =>
    counts.rootTexts > 0 && (
      <Button
        type="button"
        variant="ghost"
        className="w-full flex justify-start gap-1.5"
        onClick={() => setActiveView("root_text")}
      >
        <BiBookOpen className="text-lg" />
        {`${t("text.root_text")} (${counts.rootTexts})`}
      </Button>
    );

  const renderRelatedTextsSection = () =>
    (counts.commentaries > 0 || counts.rootTexts > 0) && (
      <>
        <p className="w-full border-b border-[#f0f0f0] text-sm font-medium text-gray-500">
          {t("text.related_texts")}
        </p>
        <div className="flex flex-col gap-2">
          {renderCommentaryButton()}
          {renderRootTextButton()}
        </div>
      </>
    );

  const renderContributorsButton = () =>
    counts.contributors > 0 && (
      <Button
        type="button"
        variant="ghost"
        className="w-full flex justify-start gap-1.5"
        onClick={() => setActiveView("contributors")}
      >
        <FaRegUser className="text-lg" />
        {`${t("panel.contributors", "Contributors")} (${counts.contributors})`}
      </Button>
    );

  const renderResourcesSection = () =>
    counts.sheets > 0 && (
      <>
        <p className="w-full border-b border-[#f0f0f0] text-sm font-medium text-gray-500">
          {t("panel.resources")}
        </p>
        <p
          className={`flex w-full items-center py-3 text-gray-700 transition hover:text-gray-600 hover:bg-gray-50 justify-start`}
        >
          <IoNewspaperOutline className="text-lg" />
          {`${t("common.sheets")} (${counts.sheets})`}
        </p>
      </>
    );

  const handleMenuItemClick = (item: any) => {
    if (item.label === "common.share") {
      setActiveView("share");
    } else if (item.label === "connection_panel.compare_text") {
      setActiveView("compare_text");
    }
  };

  const renderMenuItems = () => (
    <>
      <p className="w-full border-b border-[#f0f0f0] text-sm font-medium text-gray-500">
        {t("connection_panel.tools")}
      </p>
      {MENU_ITEMS.map((item) => (
        <Button
          type="button"
          variant="ghost"
          key={item.label}
          className="w-full flex justify-start gap-1.5"
          onClick={() => handleMenuItemClick(item)}
        >
          <item.icon className="text-lg" />
          {t(`${item.label}`)}
        </Button>
      ))}
    </>
  );

  const renderMainPanel = () => (
    <>
      <ResourceHeader title={t("panel.resources")} onClose={handleClosePanel} />
      <div className="text-left p-4 space-y-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveView("search")}
          className="w-full flex justify-start"
        >
          <BiSearch
            className={`text-lg ${storedLanguage === "bo-IN" ? "-translate-y-0.5" : ""}`}
          />
          {t("connection_panel.search_in_this_text")}
        </Button>
        {canShowTableOfContents && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setActiveView("table_of_contents")}
            className="w-full flex justify-start gap-1.5"
          >
            <LuList className="text-lg" />
            {t("text.table_of_contents")}
          </Button>
        )}
        {renderContributorsButton()}
        {renderTranslationsSection()}
        {renderRelatedTextsSection()}
        {renderResourcesSection()}
        {renderMenuItems()}
      </div>
    </>
  );

  const renderSidePanel = () => {
    switch (activeView) {
      case "share":
        return (
          <ShareView
            segmentId={segmentId}
            setIsShareView={setActiveView}
            handleNavigate={() => setActiveView("main")}
          />
        );
      case "search":
        return (
          <IndividualTextSearch
            onClose={() => setActiveView("main")}
            textId={sidePanelData?.segment_info?.text_id}
            handleSegmentNavigate={handleSegmentNavigate}
            handleNavigate={() => setActiveView("main")}
          />
        );
      case "translation":
        return (
          <TranslationView
            segmentId={segmentId}
            setIsTranslationView={setActiveView}
            addChapter={addChapter}
            currentChapter={currentChapter}
            setVersionId={setVersionId}
            handleNavigate={() => setActiveView("main")}
          />
        );
      case "commentary":
        return (
          <CommentaryView
            segmentId={segmentId}
            setIsCommentaryView={setActiveView}
            addChapter={addChapter}
            currentChapter={currentChapter}
            handleNavigate={() => setActiveView("main")}
          />
        );
      case "contributors":
        return (
          <ContributorsView
            textId={segmentTextId}
            handleNavigate={() => setActiveView("main")}
            onClose={handleClosePanel}
          />
        );
      case "table_of_contents":
        return (
          <TableOfContentsView
            textId={textId}
            handleSegmentNavigate={handleSegmentNavigate}
            handleNavigate={() => setActiveView("main")}
            onClose={handleClosePanel}
          />
        );
      case "compare_text":
        return (
          <CompareText
            setIsCompareTextView={setActiveView}
            addChapter={addChapter}
            currentChapter={currentChapter}
            handleNavigate={() => setActiveView("main")}
          />
        );
      case "root_text":
        return (
          <RootTextView
            segmentId={segmentId}
            setIsRootTextView={setActiveView}
            addChapter={addChapter}
            currentChapter={currentChapter}
            handleNavigate={() => setActiveView("main")}
          />
        );
      default:
        return renderMainPanel();
    }
  };

  return (
    <>
      <div
        className={`flex lg:w-[550px] md:w-[350px] flex-col text-left bg-navbar transition-all duration-300 overflow-y-auto ${showPanel ? "block" : "hidden"} w-full h-full border-custom-border overalltext`}
      >
        {renderSidePanel()}
      </div>
    </>
  );
};

export default Resources;
