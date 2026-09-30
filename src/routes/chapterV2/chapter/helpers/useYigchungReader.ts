import { useCallback, useEffect, useState, type RefObject } from "react";

type UseYigchungReaderArgs = {
  contentsContainerRef: RefObject<HTMLElement | null>;
  canShowYigchungs: boolean;
  yigchungCount: number;
  selectSegmentId: (segmentId: string) => void;
  openResourcesPanel: () => void;
  isResourcesPanelOpen: boolean;
  layoutMode: string;
  /** Re-run footnote DOM setup when loaded sections change. */
  contentSections: unknown;
};

const findFootnoteMarker = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest(".footnote-marker");
};

const findSegmentIdForMarker = (marker: HTMLElement): string | null => {
  const host = marker.closest("[data-segment-id]");
  return host?.getAttribute("data-segment-id") ?? null;
};

export const useYigchungReader = ({
  contentsContainerRef,
  canShowYigchungs,
  yigchungCount,
  selectSegmentId,
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

  const clearResourcesSubView = useCallback(() => {
    setResourcesSubView(null);
  }, []);

  const openYigchungPanel = useCallback(
    (marker: HTMLElement, index: number | null) => {
      const segmentId = findSegmentIdForMarker(marker);
      if (segmentId) {
        selectSegmentId(segmentId);
      }
      if (index !== null) {
        setHighlightedYigchungIndex(index);
      }
      setResourcesSubView("yigchung");
      setResourcesSubViewNonce((value) => value + 1);
      openResourcesPanel();
    },
    [openResourcesPanel, selectSegmentId],
  );

  useEffect(() => {
    const container = contentsContainerRef.current;
    if (!container) return;

    const toggleFootnoteVisibility = (target: HTMLElement) => {
      const footnote = target.nextElementSibling as HTMLElement | null;
      if (!footnote?.classList?.contains("footnote")) return;
      footnote.classList.toggle("active");
    };

    const activateYigchungMarker = (marker: HTMLElement) => {
      const rawIndex = marker.dataset.yigchungIndex;
      const index =
        rawIndex !== undefined ? Number.parseInt(rawIndex, 10) : Number.NaN;
      if (!Number.isNaN(index) && index >= 0 && index < yigchungCount) {
        openYigchungPanel(marker, index);
        return;
      }
      if (import.meta.env.DEV) {
        console.warn(
          "[yigchung] footnote marker count does not match library marks",
        );
      }
      openYigchungPanel(marker, null);
    };

    const handleMarkerInteraction = (marker: HTMLElement) => {
      if (canShowYigchungs) {
        activateYigchungMarker(marker);
        return;
      }
      toggleFootnoteVisibility(marker);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const marker = findFootnoteMarker(event.target);
      if (!marker) return;
      event.stopPropagation();
      event.preventDefault();
      handleMarkerInteraction(marker);
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const marker = findFootnoteMarker(event.target);
      if (!marker) return;
      event.preventDefault();
      event.stopPropagation();
      handleMarkerInteraction(marker);
    };

    container.addEventListener("click", handleDocumentClick);
    container.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      container.removeEventListener("click", handleDocumentClick);
      container.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [
    contentsContainerRef,
    isResourcesPanelOpen,
    canShowYigchungs,
    yigchungCount,
    openYigchungPanel,
  ]);

  useEffect(() => {
    if (canShowYigchungs) return;

    const container = contentsContainerRef.current;
    if (!container) return;

    const activeFootnotes = container.querySelectorAll(".footnote.active");
    activeFootnotes.forEach((footnote) => {
      footnote.classList.remove("active");
    });
  }, [contentsContainerRef, layoutMode, canShowYigchungs]);

  useEffect(() => {
    if (canShowYigchungs) return;

    const container = contentsContainerRef.current;
    if (!container) return;

    const footnoteMarkers =
      container.querySelectorAll<HTMLElement>(".footnote-marker");
    footnoteMarkers.forEach((marker) => {
      marker.classList.add("legacy-footnote-marker");
      marker.classList.remove("yigchung-marker");
      delete marker.dataset.yigchungIndex;
      if (!marker.textContent?.trim()) {
        marker.textContent = "*";
      }
    });

    const footnotes = container.querySelectorAll<HTMLElement>(".footnote");
    footnotes.forEach((footnote) => {
      footnote.classList.remove("yigchung-inline");
      footnote.classList.add("legacy-footnote");
      footnote.classList.remove("active");
    });
  }, [
    contentsContainerRef,
    contentSections,
    layoutMode,
    isResourcesPanelOpen,
    canShowYigchungs,
  ]);

  const contentsScrollClassName = `flex flex-1 min-h-0 w-full overflow-y-auto chapter-contents${
    canShowYigchungs ? " chapter-contents--yigchung" : ""
  }`;
  const bodyTextSizeClass = canShowYigchungs
    ? "text-xl leading-8"
    : "text-lg leading-7";

  return {
    highlightedYigchungIndex,
    resourcesSubView,
    resourcesSubViewNonce,
    clearResourcesSubView,
    contentsScrollClassName,
    bodyTextSizeClass,
  };
};
