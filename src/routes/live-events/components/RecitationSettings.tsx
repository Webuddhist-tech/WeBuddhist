import { useEffect, useRef, useState } from "react";
import { useTranslate } from "@tolgee/react";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import type { RecitationTheme } from "../utils/recitationTheme.ts";

type RecitationSettingsProps = {
  theme: RecitationTheme;
  onThemeChange: (theme: RecitationTheme) => void;
};

/** The top bar's round buttons. */
export const ICON_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--rt-line)] text-[var(--rt-ink)] transition hover:bg-[var(--rt-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rt-accent)] max-[380px]:size-9";

/**
 * On a wide screen the buttons stand in a rail down the page's edge: no box,
 * just the icon with its label beneath, lit when it is the one in use.
 */
export const RAIL_BUTTON =
  "lg:h-auto lg:w-16 lg:flex-col lg:gap-1 lg:rounded-lg lg:border-0 lg:py-1 lg:text-[var(--rt-soft)] lg:hover:bg-transparent lg:hover:text-[var(--rt-ink)]";

/** The caption under a rail button's icon; the bar's buttons go without. */
export const RAIL_LABEL =
  "hidden font-sans text-[11px] font-semibold leading-none lg:block";

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

/**
 * The page's settings, behind the "Aa" button: for now,
 * whether the text is set on a dark stage or on paper.
 */
const RecitationSettings = ({
  theme,
  onThemeChange,
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
        className={`${ICON_BUTTON} ${RAIL_BUTTON} ${open ? "lg:text-[var(--rt-accent)]" : ""}`}
      >
        <span
          aria-hidden
          className="font-serif text-[15px] font-semibold lg:text-[18px] lg:leading-[18px]"
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
        </div>
      )}
    </div>
  );
};

export default RecitationSettings;
