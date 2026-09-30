import { useCallback, useEffect, useState, type RefObject } from "react";
import {
  isLibraryYigchungMarker,
  LEGACY_FOOTNOTE_CLASSES,
  LEGACY_FOOTNOTE_MARKER_CLASSES,
  YIGCHUNG_INLINE_FOOTNOTE_CLASSES,
  YIGCHUNG_MARKER_BUTTON_CLASSES,
  YIGCHUNG_READER_CONTAINER_CLASSES,
} from "@/services/library/yigchungClasses.ts";

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

const applyLegacyFootnoteClasses = (container: HTMLElement) => {
  container
    .querySelectorAll<HTMLElement>(".footnote-marker")
    .forEach((marker) => {
      if (isLibraryYigchungMarker(marker)) return;
      marker.className = LEGACY_FOOTNOTE_MARKER_CLASSES;
      if (!marker.textContent?.trim()) {
        marker.textContent = "*";
      }
    });

  container.querySelectorAll<HTMLElement>(".footnote").forEach((footnote) => {
    if (footnote.classList.contains("yigchung-inline")) return;
    footnote.className = LEGACY_FOOTNOTE_CLASSES;
    footnote.classList.remove("active");
  });
};

const restoreYigchungFootnoteClasses = (container: HTMLElement) => {
  container
    .querySelectorAll<HTMLElement>(".footnote-marker")
    .forEach((marker) => {
      if (!isLibraryYigchungMarker(marker)) return;
      marker.className = YIGCHUNG_MARKER_BUTTON_CLASSES;
    });

  container
    .querySelectorAll<HTMLElement>(".footnote.yigchung-inline")
    .forEach((footnote) => {
      footnote.className = YIGCHUNG_INLINE_FOOTNOTE_CLASSES;
      footnote.classList.remove("active");
    });
};

/** Legacy HTML footnotes coexisting with library yigchung in the same edition. */
const prepareLegacyFootnotesInYigchungLayout = (container: HTMLElement) => {
  container
    .querySelectorAll<HTMLElement>(".footnote-marker")
    .forEach((marker) => {
      if (isLibraryYigchungMarker(marker)) return;
      marker.className = LEGACY_FOOTNOTE_MARKER_CLASSES;
      if (!marker.textContent?.trim()) {
        marker.textContent = "*";
      }
      marker.tabIndex = 0;
      marker.setAttribute("role", "button");
    });

  container.querySelectorAll<HTMLElement>(".footnote").forEach((footnote) => {
    if (footnote.classList.contains("yigchung-inline")) return;
    footnote.className = LEGACY_FOOTNOTE_CLASSES;
    footnote.classList.remove("active");
  });
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

  const clearHighlightedYigchungIndex = useCallback(() => {
    setHighlightedYigchungIndex(null);
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
      if (canShowYigchungs && isLibraryYigchungMarker(marker)) {
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

    container.querySelectorAll(".footnote.active").forEach((footnote) => {
      footnote.classList.remove("active");
    });
  }, [contentsContainerRef, layoutMode, canShowYigchungs]);

  useEffect(() => {
    const container = contentsContainerRef.current;
    if (!container) return;

    if (canShowYigchungs) {
      restoreYigchungFootnoteClasses(container);
      prepareLegacyFootnotesInYigchungLayout(container);
      return;
    }

    applyLegacyFootnoteClasses(container);
  }, [
    contentsContainerRef,
    contentSections,
    layoutMode,
    isResourcesPanelOpen,
    canShowYigchungs,
  ]);

  const contentsScrollClassName = `flex flex-1 min-h-0 w-full overflow-y-auto chapter-contents${
    canShowYigchungs ? ` ${YIGCHUNG_READER_CONTAINER_CLASSES}` : ""
  }`;
  const bodyTextSizeClass = canShowYigchungs
    ? "text-xl leading-8"
    : "text-lg leading-7";

  return {
    highlightedYigchungIndex,
    resourcesSubView,
    resourcesSubViewNonce,
    clearResourcesSubView,
    clearHighlightedYigchungIndex,
    contentsScrollClassName,
    bodyTextSizeClass,
  };
};
