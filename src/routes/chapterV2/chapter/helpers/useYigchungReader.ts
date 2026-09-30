import { useEffect, useState, type RefObject } from "react";

type UseYigchungReaderArgs = {
  contentsContainerRef: RefObject<HTMLElement | null>;
  canShowYigchungs: boolean;
  yigchungCount: number;
  openResourcesPanel: () => void;
  isResourcesPanelOpen: boolean;
  layoutMode: string;
  /** Re-run footnote DOM setup when loaded sections change. */
  contentSections: unknown;
};

export const useYigchungReader = ({
  contentsContainerRef,
  canShowYigchungs,
  yigchungCount,
  openResourcesPanel,
  isResourcesPanelOpen,
  layoutMode,
  contentSections,
}: UseYigchungReaderArgs) => {
  const [highlightedYigchungIndex, setHighlightedYigchungIndex] = useState<
    number | null
  >(null);
  const [resourcesSubView, setResourcesSubView] = useState<string | null>(null);
  const [resourcesSubViewNonce, setResourcesSubViewNonce] = useState(0);

  useEffect(() => {
    const container = contentsContainerRef.current;
    if (!container) return;

    const toggleFootnoteVisibility = (target: HTMLElement) => {
      const footnote = target.nextElementSibling as HTMLElement | null;
      if (!footnote?.classList?.contains("footnote")) return;
      const isHidden =
        footnote.style.display === "" || footnote.style.display === "none";
      footnote.style.display = isHidden ? "inline" : "none";
      footnote.classList.toggle("active");
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.classList?.contains("footnote-marker")) return;
      event.stopPropagation();
      event.preventDefault();

      if (canShowYigchungs) {
        const rawIndex = target.dataset.yigchungIndex;
        const index =
          rawIndex !== undefined ? Number.parseInt(rawIndex, 10) : Number.NaN;
        if (!Number.isNaN(index) && index >= 0 && index < yigchungCount) {
          setHighlightedYigchungIndex(index);
          setResourcesSubView("yigchung");
          setResourcesSubViewNonce((value) => value + 1);
          openResourcesPanel();
        } else if (import.meta.env.DEV) {
          console.warn(
            "[yigchung] footnote marker count does not match library marks",
          );
          setResourcesSubView("yigchung");
          setResourcesSubViewNonce((value) => value + 1);
          openResourcesPanel();
        }
        return false;
      }

      toggleFootnoteVisibility(target);
      return false;
    };

    container.addEventListener("click", handleDocumentClick);
    return () => {
      container.removeEventListener("click", handleDocumentClick);
    };
  }, [
    contentsContainerRef,
    isResourcesPanelOpen,
    canShowYigchungs,
    yigchungCount,
    openResourcesPanel,
  ]);

  useEffect(() => {
    if (canShowYigchungs) return;

    const container = contentsContainerRef.current;
    if (!container) return;

    const activeFootnotes = container.querySelectorAll(".footnote.active");
    activeFootnotes.forEach((footnote) => {
      footnote.classList.remove("active");
      (footnote as HTMLElement).style.display = "none";
    });
  }, [contentsContainerRef, layoutMode, canShowYigchungs]);

  useEffect(() => {
    const container = contentsContainerRef.current;
    if (!container) return;

    const footnoteMarkers =
      container.querySelectorAll<HTMLElement>(".footnote-marker");
    footnoteMarkers.forEach((marker, index) => {
      marker.style.cursor = "pointer";
      marker.style.zIndex = "2";
      marker.style.padding = "0 2px";
      if (canShowYigchungs) {
        marker.dataset.yigchungIndex = String(index);
        marker.setAttribute("aria-label", "Yigchung note");
        marker.classList.add("yigchung-marker");
        marker.style.color = "";
        marker.style.fontWeight = "";
        marker.style.fontSize = "";
        marker.style.verticalAlign = "";
        if (!marker.textContent?.trim()) {
          marker.textContent = String(index + 1);
        }
      } else {
        marker.classList.remove("yigchung-marker");
        delete marker.dataset.yigchungIndex;
        marker.style.color = "#007bff";
        marker.style.fontWeight = "700";
        marker.style.fontSize = "";
        marker.style.verticalAlign = "";
        if (!marker.textContent?.trim()) {
          marker.textContent = "*";
        }
      }
    });

    const footnotes = container.querySelectorAll<HTMLElement>(".footnote");
    footnotes.forEach((footnote) => {
      if (canShowYigchungs) {
        footnote.classList.remove("yigchung-inline-hidden", "active");
        footnote.classList.add("yigchung-inline");
        footnote.style.display = "inline";
        footnote.style.color = "";
        footnote.style.fontWeight = "";
        footnote.style.fontSize = "";
        footnote.style.lineHeight = "";
        footnote.style.backgroundColor = "";
        footnote.style.padding = "";
        footnote.style.margin = "";
        footnote.style.borderRadius = "";
        return;
      }
      footnote.classList.remove("yigchung-inline");
      footnote.style.display = "none";
      footnote.style.color = "#484848";
      footnote.style.margin = "4px";
      footnote.style.fontSize = "0.9rem";
      footnote.style.fontWeight = "";
      footnote.style.lineHeight = "";
      footnote.style.backgroundColor = "#f7f7f7";
      footnote.style.padding = "2px 5px";
      footnote.style.borderRadius = "3px";
    });
  }, [
    contentsContainerRef,
    contentSections,
    layoutMode,
    isResourcesPanelOpen,
    canShowYigchungs,
    yigchungCount,
  ]);

  const contentsScrollClassName = `flex flex-1 min-h-0 w-full overflow-y-auto${
    canShowYigchungs ? " chapter-contents--yigchung" : ""
  }`;
  const bodyTextSizeClass = canShowYigchungs
    ? "text-xl leading-8"
    : "text-lg leading-7";

  return {
    highlightedYigchungIndex,
    resourcesSubView,
    resourcesSubViewNonce,
    contentsScrollClassName,
    bodyTextSizeClass,
  };
};
