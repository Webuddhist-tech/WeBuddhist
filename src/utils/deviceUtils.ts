import { APP_STORE_URL, PLAY_STORE_URL } from "./constants.ts";

export const isMobileDevice = (): boolean =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const APP_OPEN_PATH = "/open";

export const openAppDownloadPage = (): void => {
  window.location.assign(APP_OPEN_PATH);
};

/** The host the app's verified App Links / Universal Links are tied to. */
const APP_LINK_HOST = "webuddhist.com";
const ANDROID_PACKAGE = "org.pecha.app";

export type AppPlatform = "ios" | "android" | null;

/**
 * Which app store a visitor's device uses, or null on a computer. iPadOS
 * asks for desktop sites and so reports itself as a Mac; a Mac with a touch
 * screen is how it gives itself away.
 */
export const detectAppPlatform = (
  userAgent: string = navigator.userAgent,
  maxTouchPoints: number = navigator.maxTouchPoints ?? 0,
): AppPlatform => {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return null;
};

/**
 * Where to send a phone that has landed on an /open link in the browser -
 * which means the app did not take the link itself.
 *
 * Android gets an intent: it opens the app if it is installed after all (an
 * in-app browser, or a link typed in, never hands over to the app on its
 * own) and goes to Google Play if not. iOS has no such fallback for a web
 * page, so it goes straight to the App Store. `path` keeps the deep link,
 * so an installed Android app still opens on the right screen.
 */
export const appStoreRedirectUrl = (
  platform: AppPlatform,
  path: string = APP_OPEN_PATH,
): string | null => {
  if (platform === "ios") return APP_STORE_URL;
  if (platform === "android") {
    const fallback = encodeURIComponent(PLAY_STORE_URL);
    return `intent://${APP_LINK_HOST}${path}#Intent;scheme=https;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
  }
  return null;
};
