import { useEffect, useRef } from "react";
import { useTranslate } from "@tolgee/react";
import ResourceHeader from "../common/ResourceHeader.tsx";
import ResourceState from "../common/ResourceState.tsx";
import { useTransliteration } from "@/context/TransliterationContext.tsx";
import { useYigchungs } from "@/hooks/useYigchungs.ts";

type YigchungViewProps = {
  textId?: string;
  highlightedIndex?: number | null;
  handleSegmentNavigate: (segmentId: string) => void;
  handleNavigate: () => void;
  onClose: () => void;
};

const YigchungView = ({
  textId,
  highlightedIndex = null,
  handleSegmentNavigate,
  handleNavigate,
  onClose,
}: YigchungViewProps) => {
  const { t } = useTranslate();
  const { displayContent, contentClass } = useTransliteration();
  const { data, isLoading, error } = useYigchungs(textId);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const languageClass = contentClass(data?.text_detail?.language || "en");
  const items = data?.items ?? [];

  useEffect(() => {
    if (highlightedIndex == null) return;
    const node = itemRefs.current[highlightedIndex];
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightedIndex, items.length]);

  const handleNoteKeyDown =
    (segmentId: string | undefined) =>
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (!segmentId) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleSegmentNavigate(segmentId);
      }
    };

  return (
    <div className="flex h-full flex-col">
      <ResourceHeader
        title={t("text.yigchung")}
        onBack={handleNavigate}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-4 text-left">
        <ResourceState
          isLoading={isLoading}
          isError={error}
          isEmpty={items.length === 0}
        >
          <ul className="space-y-3">
            {items.map((item) => {
              const isHighlighted = highlightedIndex === item.index;
              return (
                <li key={item.id}>
                  <div
                    ref={(node) => {
                      itemRefs.current[item.index] = node;
                    }}
                    className={`rounded-lg border px-3 py-2 transition ${
                      isHighlighted
                        ? "border-[#102544]/40 bg-[#102544]/5 ring-1 ring-[#102544]/20"
                        : "border-slate-200/80 bg-slate-50/80"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {item.label}
                    </p>
                    {item.content ? (
                      <div
                        className={`mt-1.5 text-base leading-relaxed text-[#636363] ${languageClass}`}
                        dangerouslySetInnerHTML={{
                          __html: displayContent(item.content),
                        }}
                      />
                    ) : (
                      <p className="mt-1.5 text-sm italic text-slate-400">
                        {t("text.yigchung_empty")}
                      </p>
                    )}
                    {item.anchorSegmentId && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-[#102544] hover:underline"
                        onClick={() =>
                          handleSegmentNavigate(item.anchorSegmentId as string)
                        }
                        onKeyDown={handleNoteKeyDown(item.anchorSegmentId)}
                      >
                        {t("text.yigchung_go_to_anchor")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ResourceState>
      </div>
    </div>
  );
};

export default YigchungView;
