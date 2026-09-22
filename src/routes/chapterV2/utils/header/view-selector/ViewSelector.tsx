import React from "react";
import { useTranslate } from "@tolgee/react";
import { ImParagraphJustify } from "react-icons/im";
import { LuAlignJustify } from "react-icons/lu";
import {
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useTransliteration } from "@/context/TransliterationContext.tsx";
import { MODE_OPTIONS, SCRIPT_OPTIONS } from "@/utils/transliteration.ts";

export const VIEW_MODES = {
  SOURCE: "SOURCE",
  TRANSLATIONS: "TRANSLATIONS",
  SOURCE_AND_TRANSLATIONS: "SOURCE_AND_TRANSLATIONS",
};

export const LAYOUT_MODES = {
  SEGMENTED: "SEGMENTED",
  PROSE: "PROSE",
};

const options = [
  {
    id: "1",
    label: "text.reader_option_menu.source",
    value: VIEW_MODES.SOURCE,
  },
  {
    id: "2",
    label: "text.reader_option_menu.translation",
    value: VIEW_MODES.TRANSLATIONS,
  },
  {
    id: "3",
    label: "text.reader_option_menu.source_with_translation",
    value: VIEW_MODES.SOURCE_AND_TRANSLATIONS,
  },
];

const layoutOptions = [
  {
    id: "layout-1",
    icon: <ImParagraphJustify className="size-5" />,
    value: LAYOUT_MODES.PROSE,
    label: "Prose",
  },
  {
    id: "layout-2",
    icon: <LuAlignJustify className="size-5" />,
    value: LAYOUT_MODES.SEGMENTED,
    label: "Segmented",
  },
];

type ViewSelectorProps = {
  viewMode: string;
  setViewMode: (viewMode: string) => void;
  layoutMode: string;
  setLayoutMode: (layoutMode: string) => void;
  versionSelected?: boolean;
};

const ViewSelector = ({
  versionSelected,
  viewMode,
  setViewMode,
  layoutMode,
  setLayoutMode,
}: ViewSelectorProps) => {
  const { t } = useTranslate();
  const { script, setScript, mode, setMode, isTransliterating } =
    useTransliteration();

  const renderViewModeOptions = () => {
    return (
      <div className="flex flex-col">
        <DropdownMenuRadioGroup
          className="space-y-2"
          value={viewMode}
          onValueChange={setViewMode}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.value}
              className="flex items-center gap-2 rounded-md border px-3 py-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
            >
              <span className="text-sm text-foreground">{t(option.label)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </div>
    );
  };

  // One row per choice, so they sit alongside the view and layout options
  // rather than unrolling twenty entries into the menu. The source script is
  // always detected from the text, so there is nothing else to choose here.
  const renderMenuRow = (
    labelKey: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    menuOptions: readonly { value: string; labelKey: string; label: string }[],
  ) => {
    const selected =
      menuOptions.find((option) => option.value === value) ?? menuOptions[0];
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="rounded-md border px-3 py-2">
          <span className="text-sm text-foreground">{t(labelKey, label)}</span>
          <span className="ml-auto pl-2 text-sm text-[#676767]">
            {t(selected.labelKey, selected.label)}
          </span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
            <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
              {menuOptions.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <span className="text-sm text-foreground">
                    {t(option.labelKey, option.label)}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  };

  return (
    <div className="flex  p-2 space-y-2 flex-col">
      {versionSelected && renderViewModeOptions()}
      <DropdownMenuLabel className="text-sm font-medium text-[#676767]">
        {t("text.reader_option_menu.layout")}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={layoutMode}
        onValueChange={setLayoutMode}
        className="grid grid-cols-2 gap-2"
      >
        {layoutOptions.map((option) => (
          <DropdownMenuRadioItem
            key={option.id}
            value={option.value}
            className="flex items-center gap-2 rounded-md border px-3 py-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
          >
            <span className="text-muted-foreground">{option.icon}</span>
            <span className="text-sm text-foreground">{option.label}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      {renderMenuRow(
        "text.script.title",
        "Script",
        script,
        setScript,
        SCRIPT_OPTIONS,
      )}
      {/* Nothing to place while the text is shown as stored. */}
      {isTransliterating &&
        renderMenuRow(
          "text.script.mode",
          "Transliteration",
          mode,
          setMode,
          MODE_OPTIONS,
        )}
    </div>
  );
};

export default React.memo(ViewSelector);
