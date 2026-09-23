import { useTranslate } from "@tolgee/react";
import { IoAdd, IoPause, IoPlay, IoRemove } from "react-icons/io5";
import { Button } from "@/components/ui/button.tsx";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu.tsx";

export const AUTO_SCROLL_SPEEDS = {
  SLOW: 20,
  NORMAL: 40,
  FAST: 70,
  VERY_FAST: 110,
};

/**
 * The presets in order, each with the name shown between the step buttons. A
 * bare number means nothing to a reader, and the row needs something to read
 * between the minus and the plus.
 */
const SPEED_OPTIONS = [
  {
    value: AUTO_SCROLL_SPEEDS.SLOW,
    labelKey: "text.reader_option_menu.auto_scroll_speed_slow",
    label: "Slow",
  },
  {
    value: AUTO_SCROLL_SPEEDS.NORMAL,
    labelKey: "text.reader_option_menu.auto_scroll_speed_normal",
    label: "Normal",
  },
  {
    value: AUTO_SCROLL_SPEEDS.FAST,
    labelKey: "text.reader_option_menu.auto_scroll_speed_fast",
    label: "Fast",
  },
  {
    value: AUTO_SCROLL_SPEEDS.VERY_FAST,
    labelKey: "text.reader_option_menu.auto_scroll_speed_very_fast",
    label: "Very fast",
  },
] as const;

type AutoScrollControlProps = {
  isAutoScrolling: boolean;
  onToggle: () => void;
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
};

/**
 * A section of the reader option menu, sitting alongside the view, layout and
 * script choices rather than behind a header button of its own. Stopping does
 * not need the menu: the reader already halts on any wheel, touch or pointer
 * event in the text.
 */
const AutoScrollControl = ({
  isAutoScrolling,
  onToggle,
  scrollSpeed,
  onSpeedChange,
}: AutoScrollControlProps) => {
  const { t } = useTranslate();

  const currentIndex = SPEED_OPTIONS.findIndex(
    (option) => option.value === scrollSpeed,
  );
  // An unrecognised stored speed should still leave the row readable.
  const selectedIndex = currentIndex === -1 ? 0 : currentIndex;
  const canDecrease = selectedIndex > 0;
  const canIncrease = selectedIndex < SPEED_OPTIONS.length - 1;
  const selected = SPEED_OPTIONS[selectedIndex];

  const handleDecreaseSpeed = () => {
    if (canDecrease) onSpeedChange(SPEED_OPTIONS[selectedIndex - 1].value);
  };
  const handleIncreaseSpeed = () => {
    if (canIncrease) onSpeedChange(SPEED_OPTIONS[selectedIndex + 1].value);
  };

  return (
    <>
      <DropdownMenuLabel className="text-sm font-medium text-[#676767]">
        {t("text.reader_option_menu.auto_scroll", "Auto-scroll")}
      </DropdownMenuLabel>
      <div
        className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${
          isAutoScrolling ? "border-primary bg-primary/5" : ""
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            isAutoScrolling
              ? t("text.reader_option_menu.auto_scroll_pause")
              : t("text.reader_option_menu.auto_scroll_play")
          }
          className="flex cursor-pointer items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
              isAutoScrolling
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {isAutoScrolling ? (
              <IoPause size={14} aria-hidden="true" />
            ) : (
              <IoPlay size={14} className="ml-0.5" aria-hidden="true" />
            )}
          </span>
          <span className="text-sm text-foreground">
            {isAutoScrolling
              ? t("text.reader_option_menu.auto_scroll_stop_label", "Pause")
              : t("text.reader_option_menu.auto_scroll_play_label", "Play")}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={handleDecreaseSpeed}
            disabled={!canDecrease}
            aria-label={t("text.reader_option_menu.auto_scroll_speed_decrease")}
            className="cursor-pointer"
          >
            <IoRemove aria-hidden="true" />
          </Button>
          <span className="min-w-[62px] text-center text-sm text-[#676767]">
            {t(selected.labelKey, selected.label)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={handleIncreaseSpeed}
            disabled={!canIncrease}
            aria-label={t("text.reader_option_menu.auto_scroll_speed_increase")}
            className="cursor-pointer"
          >
            <IoAdd aria-hidden="true" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AutoScrollControl;
