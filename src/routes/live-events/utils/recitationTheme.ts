import type { CSSProperties } from "react";

export type RecitationTheme = "dark" | "light";

/**
 * The live recitation page's colours, as CSS variables the page and its
 * panels read (`bg-[var(--rt-stage)]`). Dark is the operator's own screen,
 * for a hall with the lights down; light is paper, for daylight.
 *
 * They are set as a style rather than a class because the contents drawer
 * renders outside the page, in a portal, and takes the same set.
 */
const THEMES: Record<RecitationTheme, Record<string, string>> = {
  dark: {
    "--rt-stage": "#000000",
    "--rt-panel": "#1c1c1e",
    "--rt-raised": "#2c2c2e",
    "--rt-line": "#2c2c2e",
    "--rt-ink": "#f2f2f7",
    "--rt-soft": "#8e8e93",
    "--rt-faint": "#6c6c70",
    "--rt-live": "rgba(229, 35, 28, 0.25)",
    "--rt-live-ink": "#ffffff",
    "--rt-live-soft": "rgba(242, 242, 247, 0.8)",
    "--rt-pace": "#ff6961",
    "--rt-glow": "rgba(255, 105, 97, 0.55)",
    "--rt-accent": "#e5231c",
    "--rt-accent-hover": "#ff3a33",
    "--rt-notice": "#3a2f1a",
    "--rt-notice-ink": "#f2c879",
  },
  light: {
    "--rt-stage": "#faf8f4",
    "--rt-panel": "#ffffff",
    "--rt-raised": "#efebe4",
    "--rt-line": "#e6e0d6",
    "--rt-ink": "#1c1c1e",
    "--rt-soft": "#6e6e73",
    "--rt-faint": "#8e8e93",
    "--rt-live": "rgba(229, 35, 28, 0.09)",
    "--rt-live-ink": "#111111",
    "--rt-live-soft": "#3a3a3c",
    "--rt-pace": "#e5231c",
    "--rt-glow": "rgba(229, 35, 28, 0.25)",
    "--rt-accent": "#e5231c",
    "--rt-accent-hover": "#c81d17",
    "--rt-notice": "#fdf3dc",
    "--rt-notice-ink": "#7a5200",
  },
};

export const recitationThemeStyle = (theme: RecitationTheme): CSSProperties =>
  ({ ...THEMES[theme], colorScheme: theme }) as CSSProperties;

const STORAGE_KEY = "webuddhist.liveRecitation.theme";

/** The reader's last choice on this device; dark until they make one. */
export const loadRecitationTheme = (): RecitationTheme => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export const saveRecitationTheme = (theme: RecitationTheme): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // A private window or blocked storage: the choice lasts for this visit.
  }
};

/** The whole text, scrolling with the room, or only the line it is on. */
export type RecitationView = "live" | "full";

const VIEW_STORAGE_KEY = "webuddhist.liveRecitation.view";

/** The reader's last choice on this device; the live line until they make one. */
export const loadRecitationView = (): RecitationView => {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "full" ? "full" : "live";
  } catch {
    return "live";
  }
};

export const saveRecitationView = (view: RecitationView): void => {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // A private window or blocked storage: the choice lasts for this visit.
  }
};

const TRANSLATION_STORAGE_KEY = "webuddhist.liveRecitation.translation";

/** The reader's last choice on this device; with the translation until they make one. */
export const loadShowTranslation = (): boolean => {
  try {
    return localStorage.getItem(TRANSLATION_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

export const saveShowTranslation = (show: boolean): void => {
  try {
    localStorage.setItem(TRANSLATION_STORAGE_KEY, show ? "on" : "off");
  } catch {
    // A private window or blocked storage: the choice lasts for this visit.
  }
};
