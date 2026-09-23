import React, { useEffect } from "react";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { MdClose } from "react-icons/md";
import { IoChevronBackSharp } from "react-icons/io5";
import ViewSelector from "./view-selector/ViewSelector.tsx";
import { getLanguageClass } from "../../../../utils/helperFunctions.tsx";
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
import AutoScrollControl from "./AutoScrollControl.tsx";

const ChapterHeader = (props: any) => {
  const {
    viewMode,
    setViewMode,
    layoutMode,
    setLayoutMode,
    textdetail,
    showTableOfContents,
    setShowTableOfContents,
    removeChapter,
    currentChapter,
    totalChapters,
    versionSelected,
    canShowTableOfContents = true,
    editionId,
    isAutoScrolling,
    onToggleAutoScroll,
    scrollSpeed,
    setScrollSpeed,
  } = props;
  const {
    isResourcesPanelOpen,
    isViewSelectorOpen,
    setIsViewSelectorOpen,
    closeResourcesPanel,
  } = usePanelContext() as any;
  const navigate = useNavigate();

  const handleBackClick = () => navigate(-1);
  const handleToggleTableOfContents = () =>
    setShowTableOfContents((prev: boolean) => !prev);
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

  return (
    <div className="flex w-full shrink-0 items-center justify-center p-2  border-b border-gray-200 bg-[#f8f8f8]">
      {canShowTableOfContents && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleToggleTableOfContents}
        >
          {showTableOfContents ? (
            <LuPanelLeftClose size={20} />
          ) : (
            <LuPanelLeftOpen size={20} />
          )}
        </Button>
      )}

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
          className={`min-w-0 w-fit truncate whitespace-nowrap text-lg font-medium ${getLanguageClass(textdetail?.language)}`}
        >
          {textdetail?.title}
        </p>
        <div className="flex items-center gap-1">
          <EditionAudioPlayer editionId={editionId} />
          <AutoScrollControl
            isAutoScrolling={isAutoScrolling}
            onToggle={onToggleAutoScroll}
            scrollSpeed={scrollSpeed}
            onSpeedChange={setScrollSpeed}
          />
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
