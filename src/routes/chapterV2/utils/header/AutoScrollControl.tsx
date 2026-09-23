import { useTranslate } from "@tolgee/react";
import { IoAdd, IoPlay, IoRemove, IoStop } from "react-icons/io5";
import { PiCaretDoubleDownBold } from "react-icons/pi";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

export const AUTO_SCROLL_SPEEDS = {
  SLOW: 20,
  NORMAL: 40,
  FAST: 70,
  VERY_FAST: 110,
};

const SPEED_VALUES = Object.values(AUTO_SCROLL_SPEEDS);

type AutoScrollControlProps = {
  isAutoScrolling: boolean;
  onToggle: () => void;
  scrollSpeed: number;
  onSpeedChange: (speed: number) => void;
};

const AutoScrollControl = ({
  isAutoScrolling,
  onToggle,
  scrollSpeed,
  onSpeedChange,
}: AutoScrollControlProps) => {
  const { t } = useTranslate();

  const currentIndex = SPEED_VALUES.indexOf(scrollSpeed);
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < SPEED_VALUES.length - 1;

  const decreaseSpeed = () => {
    if (canDecrease) onSpeedChange(SPEED_VALUES[currentIndex - 1]);
  };
  const increaseSpeed = () => {
    if (canIncrease) onSpeedChange(SPEED_VALUES[currentIndex + 1]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center justify-center"
          aria-label={t("text.reader_option_menu.auto_scroll")}
        >
          <PiCaretDoubleDownBold size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center gap-1 p-2">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={decreaseSpeed}
            disabled={!canDecrease}
            aria-label={t("text.reader_option_menu.auto_scroll_speed_decrease")}
            className="cursor-pointer"
          >
            <IoRemove aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={onToggle}
            aria-label={
              isAutoScrolling
                ? t("text.reader_option_menu.auto_scroll_pause")
                : t("text.reader_option_menu.auto_scroll_play")
            }
            className="cursor-pointer"
          >
            {isAutoScrolling ? (
              <IoStop aria-hidden="true" />
            ) : (
              <IoPlay className="ml-0.5" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={increaseSpeed}
            disabled={!canIncrease}
            aria-label={t("text.reader_option_menu.auto_scroll_speed_increase")}
            className="cursor-pointer"
          >
            <IoAdd aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AutoScrollControl;
