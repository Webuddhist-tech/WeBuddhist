import { useEffect, useRef, useState } from "react";
import { useTranslate } from "@tolgee/react";
import {
  IoLanguageOutline,
  IoMoonOutline,
  IoSunnyOutline,
  IoTextOutline,
} from "react-icons/io5";
import type { RecitationTheme } from "../utils/recitationTheme.ts";

type RecitationSettingsProps = {
  theme: RecitationTheme;
  onThemeChange: (theme: RecitationTheme) => void;
  /** Whether there is a translation to show or leave out. */
  canTranslate?: boolean;
  showTranslation?: boolean;
  onShowTranslationChange?: (show: boolean) => void;
  /** The text size as a step, 0 the smallest, and how many steps there are. */
  textSize?: number;
  textSizeCount?: number;
  onTextSizeChange?: (size: number) => void;
};

/** The top bar's round buttons. */
export const ICON_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--rt-line)] text-[var(--rt-ink)] transition hover:bg-[var(--rt-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rt-accent)] max-[380px]:size-9";

/**
 * On a wide screen the buttons stand in a rail down the page's edge: no box,
 * just the icon with its label beneath, lit when it is the one in use.
 */
export const RAIL_BUTTON =
  "lg:h-auto lg:w-14 lg:flex-col lg:gap-0.5 lg:rounded-lg lg:border-0 lg:py-1 lg:hover:bg-transparent";

/**
 * The rail button's colour, one or the other and never both: the red of the
 * mark for the one in use, a quiet grey for the rest. Two colour classes on one
 * element would be settled by stylesheet order, not by which was meant.
 */
export const railColor = (active: boolean): string =>
  active
    ? "lg:text-[var(--rt-accent)]"
    : "lg:text-[var(--rt-soft)] lg:hover:text-[var(--rt-ink)]";

/** The caption under a rail button's icon; the bar's buttons go without. */
export const RAIL_LABEL =
  "hidden font-sans text-[10px] font-semibold leading-none lg:block";

const OPTIONS: {
  theme: RecitationTheme;
  label: string;
  Icon: typeof IoMoonOutline;
}[] = [
  {
    theme: "dark",
    label: "live_events.recitation_theme_dark",
    Icon: IoMoonOutline,
  },
  {
    theme: "light",
    label: "live_events.recitation_theme_light",
    Icon: IoSunnyOutline,
  },
];

const TRANSLATION_OPTIONS: {
  show: boolean;
  label: string;
  Icon: typeof IoMoonOutline;
}[] = [
  {
    show: true,
    label: "live_events.recitation_translation_with",
    Icon: IoLanguageOutline,
  },
  {
    show: false,
    label: "live_events.recitation_translation_without",
    Icon: IoTextOutline,
  },
];

/**
 * The page's settings, behind the "Aa" button: whether the text is set on a
 * dark stage or on paper, and whether the translation comes with it.
 */
const RecitationSettings = ({
  theme,
  onThemeChange,
  canTranslate = false,
  showTranslation = true,
  onShowTranslationChange,
  textSize = 0,
  textSizeCount = 0,
  onTextSizeChange,
}: RecitationSettingsProps) => {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("live_events.recitation_settings")}
        title={t("live_events.recitation_settings")}
        className={`${ICON_BUTTON} ${RAIL_BUTTON} ${railColor(open)}`}
      >
        <span
          aria-hidden
          className="font-serif text-[15px] font-semibold lg:text-[16px] lg:leading-4"
        >
          Aa
        </span>
        <span className={RAIL_LABEL}>
          {t("live_events.recitation_settings")}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("live_events.recitation_settings")}
          className="absolute right-0 top-full z-30 mt-2 w-60 lg:left-full lg:right-auto lg:top-0 lg:ml-2 lg:mt-0 rounded-2xl border border-[var(--rt-line)] bg-[var(--rt-panel)] p-3 text-[var(--rt-ink)] shadow-xl shadow-black/20"
        >
          <p
            id="recitation-theme-label"
            className="px-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]"
          >
            {t("live_events.recitation_theme")}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="recitation-theme-label"
            className="mt-2 grid grid-cols-2 gap-2"
          >
            {OPTIONS.map(({ theme: option, label, Icon }) => {
              const selected = option === theme;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onThemeChange(option)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-[var(--rt-accent)] bg-[var(--rt-raised)] text-[var(--rt-ink)]"
                      : "border-[var(--rt-line)] text-[var(--rt-soft)] hover:bg-[var(--rt-raised)]"
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  {t(label)}
                </button>
              );
            })}
          </div>

          {onTextSizeChange && textSizeCount > 1 && (
            <>
              <p
                id="recitation-text-size-label"
                className="mt-4 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]"
              >
                {t("live_events.recitation_text_size")}
              </p>
              <div
                role="group"
                aria-labelledby="recitation-text-size-label"
                className="mt-2 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onTextSizeChange(textSize - 1)}
                  disabled={textSize <= 0}
                  aria-label={t("live_events.recitation_text_smaller")}
                  title={t("live_events.recitation_text_smaller")}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--rt-line)] font-serif text-sm font-semibold text-[var(--rt-ink)] transition hover:bg-[var(--rt-raised)] disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  A
                </button>
                <div aria-hidden className="flex items-center gap-1">
                  {Array.from({ length: textSizeCount }, (_, index) => (
                    <span
                      key={index}
                      className={`size-1.5 rounded-full ${
                        index === textSize
                          ? "bg-[var(--rt-accent)]"
                          : "bg-[var(--rt-line)]"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onTextSizeChange(textSize + 1)}
                  disabled={textSize >= textSizeCount - 1}
                  aria-label={t("live_events.recitation_text_larger")}
                  title={t("live_events.recitation_text_larger")}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--rt-line)] font-serif text-2xl font-semibold text-[var(--rt-ink)] transition hover:bg-[var(--rt-raised)] disabled:opacity-35 disabled:hover:bg-transparent"
                >
                  A
                </button>
              </div>
            </>
          )}

          {canTranslate && onShowTranslationChange && (
            <>
              <p
                id="recitation-translation-label"
                className="mt-4 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]"
              >
                {t("live_events.recitation_translation")}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="recitation-translation-label"
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {TRANSLATION_OPTIONS.map(({ show, label, Icon }) => {
                  const selected = show === showTranslation;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onShowTranslationChange(show)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-sm font-medium transition ${
                        selected
                          ? "border-[var(--rt-accent)] bg-[var(--rt-raised)] text-[var(--rt-ink)]"
                          : "border-[var(--rt-line)] text-[var(--rt-soft)] hover:bg-[var(--rt-raised)]"
                      }`}
                    >
                      <Icon className="size-5" aria-hidden />
                      {t(label)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RecitationSettings;
