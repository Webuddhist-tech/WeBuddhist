/** Tailwind classes for library yigchung markup injected into segment HTML. */
export const YIGCHUNG_MARKER_BUTTON_CLASSES =
  "footnote-marker yigchung-marker pointer-events-auto relative z-10 cursor-pointer m-0 border-0 bg-transparent px-0.5 font-inherit text-[#636363] font-medium text-[0.72em] align-super leading-none";

export const YIGCHUNG_INLINE_FOOTNOTE_CLASSES =
  "footnote yigchung-inline inline text-[0.86em] font-normal leading-[1.35] text-[#636363] bg-transparent p-0 m-0 rounded-none align-baseline [&_*]:text-inherit [&_*]:text-[length:inherit] [&_*]:font-[inherit] [&_*]:leading-[inherit]";

/** Legacy footnote markers (non-yigchung texts). */
export const LEGACY_FOOTNOTE_MARKER_CLASSES =
  "footnote-marker legacy-footnote-marker cursor-pointer z-[2] px-0.5 text-blue-600 font-bold";

export const LEGACY_FOOTNOTE_CLASSES =
  "footnote legacy-footnote hidden text-[#484848] my-1 text-[0.9rem] leading-normal bg-[#f7f7f7] px-1.5 py-0.5 rounded-sm [&.active]:inline";

/** Reader container when Pecha-style yigchung is active (replaces App.css chapter-contents--yigchung). */
export const YIGCHUNG_READER_CONTAINER_CLASSES =
  "text-gray-900 [&_.bo-text]:text-gray-900 [&_.en-text]:text-gray-900 [&_.zh-text]:text-gray-900 [&_.en-serif-text]:text-gray-900";

export const isLibraryYigchungMarker = (marker: HTMLElement): boolean => {
  if (marker.classList.contains("yigchung-marker")) return true;
  if (marker.dataset.yigchungIndex !== undefined) return true;
  const next = marker.nextElementSibling;
  return (
    next instanceof HTMLElement && next.classList.contains("yigchung-inline")
  );
};
