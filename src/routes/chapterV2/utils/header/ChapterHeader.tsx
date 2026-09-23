import React, { useEffect } from "react";
import { MdClose } from "react-icons/md";
import { IoChevronBackSharp } from "react-icons/io5";
import ViewSelector from "./view-selector/ViewSelector.tsx";
import { useTransliteration } from "../../../../context/TransliterationContext.tsx";
import { usePanelContext } from "../../../../context/PanelContext.tsx";
import { useNavigate } from "react-router-dom";
import langicon from "@/assets/icons/langicon.svg";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import EditionAudioPlayer from "./EditionAudioPlayer.tsx";

const ChapterHeader = (props: any) => {
  const {
    viewMode,
    setViewMode,
    layoutMode,
    setLayoutMode,
    textdetail,
    removeChapter,
    currentChapter,
    totalChapters,
    versionSelected,
    canShowSectionTitles = false,
    editionId,
    isAutoScrolling,
    onToggleAutoScroll,
    scrollSpeed,
    setScrollSpeed,
    sectionTitleMode,
    setSectionTitleMode,
  } = props;
  const {
    isResourcesPanelOpen,
    isViewSelectorOpen,
    setIsViewSelectorOpen,
    closeResourcesPanel,
  } = usePanelContext() as any;
  const navigate = useNavigate();
  const { displayContent, contentClass } = useTransliteration();

  const handleBackClick = () => navigate(-1);
  const handleCloseChapter = () => removeChapter(currentChapter);

  useEffect(() => {
    if (!isResourcesPanelOpen) {
      return;
    }
    setIsViewSelectorOpen(false);
  }, [isResourcesPanelOpen, setIsViewSelectorOpen]);

  const handleViewSelectorOpenChange = (open: boolean) => {
    if (open) {
      closeResourcesPanel();
    }
    setIsViewSelectorOpen(open);
  };

  // Close the menu on start, so the reader can see the text it just set moving;
  // the menu would otherwise sit over the page for the whole scroll. Pausing
  // leaves it open: the reader is most likely there to change the speed and set
  // it going again, and closing would cost them a reopen each time.
  const handleToggleAutoScroll = () => {
    onToggleAutoScroll?.();
    if (!isAutoScrolling) setIsViewSelectorOpen(false);
  };

  return (
    <div className="flex w-full shrink-0 items-center justify-center p-2  border-b border-gray-200 bg-[#f8f8f8]">
      <div className="flex w-full md:max-w-[700px] items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          onClick={handleBackClick}
        >
          <IoChevronBackSharp size={20} />
        </Button>
        <p
          className={`min-w-0 w-fit truncate whitespace-nowrap text-lg font-medium ${contentClass(textdetail?.language)}`}
        >
          {displayContent(textdetail?.title)}
        </p>
        <div className="flex items-center gap-1">
          <EditionAudioPlayer editionId={editionId} />
          <DropdownMenu
            open={isViewSelectorOpen}
            onOpenChange={handleViewSelectorOpenChange}
          >
            <DropdownMenuTrigger asChild>
              <button className="flex cursor-pointer items-center justify-center">
                <img
                  src={langicon}
                  alt="view selector"
                  className="h-4 w-[17px]"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ViewSelector
                viewMode={viewMode}
                setViewMode={setViewMode}
                layoutMode={layoutMode}
                setLayoutMode={setLayoutMode}
                versionSelected={versionSelected}
                sectionTitleMode={sectionTitleMode}
                setSectionTitleMode={setSectionTitleMode}
                canShowSectionTitles={canShowSectionTitles}
                isAutoScrolling={isAutoScrolling}
                onToggleAutoScroll={handleToggleAutoScroll}
                scrollSpeed={scrollSpeed}
                setScrollSpeed={setScrollSpeed}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {totalChapters > 1 && (
        <button
          className="flex items-center justify-center rounded p-2 text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring focus-visible:ring-red-200"
          onClick={handleCloseChapter}
          aria-label="Close chapter"
          type="button"
        >
          <MdClose size={20} />
        </button>
      )}
    </div>
  );
};

export default React.memo(ChapterHeader);
