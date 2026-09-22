import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { useTransliteration } from "../../../../../../context/TransliterationContext.tsx";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  firstSegmentIdInSection,
  useTableOfContents,
} from "@/hooks/useTableOfContents.ts";
import type { TocSection } from "@/services/library";

/**
 * Indent for each level of the outline, one class per depth.
 *
 * Spelled out rather than computed because Tailwind only emits classes it can
 * read in the source, and the last entry doubles as the cap: past this the rows
 * have no width left for the title.
 */
const INDENT_CLASSES = [
  "ps-0",
  "ps-3",
  "ps-6",
  "ps-9",
  "ps-12",
  "ps-15",
  "ps-18",
];

type TableOfContentsViewProps = {
  textId?: string;
  handleSegmentNavigate: (segmentId: string) => void;
  handleNavigate: () => void;
  onClose: () => void;
};

const TableOfContentsView = ({
  textId,
  handleSegmentNavigate,
  handleNavigate,
  onClose,
}: TableOfContentsViewProps) => {
  const { t } = useTranslate();
  const { displayContent, contentClass } = useTransliteration();
  const {
    data: tableOfContents,
    isLoading,
    error,
  } = useTableOfContents(textId);

  /**
   * Collapsed rather than expanded, so every entry starts open.
   *
   * The outline is what the panel is for; a reader who has to click through
   * four levels before a chapter title appears is worse off than one who
   * scrolls. Collapsing stays available for the texts whose outline runs to a
   * thousand entries.
   */
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  // Both handlers are built per row rather than written inline at the call
  // site, so every click target carries a named handler.
  const handleToggleSection = (sectionId: string) => () =>
    setCollapsedSections((previous) => ({
      ...previous,
      [sectionId]: !previous[sectionId],
    }));

  const handleSectionSelect = (segmentId: string) => () =>
    handleSegmentNavigate(segmentId);

  const sections = (tableOfContents?.contents ?? []).flatMap(
    (content) => content.sections ?? [],
  );
  const languageClass = contentClass(
    tableOfContents?.text_detail?.language || "en",
  );

  const renderToggle = (section: TocSection, hasChildren: boolean) => {
    if (!hasChildren) return <span className="w-8 shrink-0" aria-hidden />;
    const isExpanded = !collapsedSections[section.id];
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 cursor-pointer text-gray-500"
        aria-expanded={isExpanded}
        /* The title beside it is a button too, and it goes somewhere else
           entirely, so this one says what it does rather than repeating the
           name. */
        aria-label={
          isExpanded
            ? t("common.collapse", { title: section.title })
            : t("common.expand", { title: section.title })
        }
        onClick={handleToggleSection(section.id)}
      >
        {isExpanded ? (
          <FiChevronDown size={16} />
        ) : (
          <FiChevronRight size={16} />
        )}
      </Button>
    );
  };

  const renderTitle = (section: TocSection, segmentId?: string) => {
    const className = `w-full py-1.5 text-left text-base text-gray-800 ${languageClass}`;
    // A section the library could not anchor to a segment has nowhere to send
    // the reader, so it stays in the outline as plain text rather than as a
    // button that does nothing.
    if (!segmentId) {
      return (
        <p className={`${className} text-gray-500`}>
          {displayContent(section.title)}
        </p>
      );
    }
    return (
      <button
        type="button"
        onClick={handleSectionSelect(segmentId)}
        className={`${className} cursor-pointer transition hover:text-[#a70c0c]`}
      >
        {displayContent(section.title)}
      </button>
    );
  };

  const renderSection = (section: TocSection, depth: number) => {
    const children = section.sections ?? [];
    const hasChildren = children.length > 0;
    return (
      <div key={section.id}>
        <div
          className={`flex items-start gap-1 rounded transition hover:bg-gray-50 ${
            INDENT_CLASSES[Math.min(depth, INDENT_CLASSES.length - 1)]
          }`}
        >
          {renderToggle(section, hasChildren)}
          {renderTitle(section, firstSegmentIdInSection(section))}
        </div>
        {hasChildren &&
          !collapsedSections[section.id] &&
          children.map((child) => renderSection(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <ResourceHeader
        title={t("text.table_of_contents")}
        onBack={handleNavigate}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4 text-left">
        <ResourceState
          isLoading={isLoading}
          isError={error}
          isEmpty={sections.length === 0}
        >
          <div>{sections.map((section) => renderSection(section, 0))}</div>
        </ResourceState>
      </div>
    </div>
  );
};

export default TableOfContentsView;
