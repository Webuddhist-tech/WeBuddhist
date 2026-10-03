import { describe, expect, test } from "vitest";
import { appStoreRedirectUrl, detectAppPlatform } from "./deviceUtils.ts";
import { APP_STORE_URL, PLAY_STORE_URL } from "./constants.ts";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

describe("detectAppPlatform", () => {
  test("tells phones apart from computers", () => {
    expect(detectAppPlatform(IPHONE, 5)).toBe("ios");
    expect(detectAppPlatform(ANDROID, 5)).toBe("android");
    expect(detectAppPlatform(WINDOWS, 0)).toBeNull();
    expect(detectAppPlatform(MAC, 0)).toBeNull();
  });

  test("sees through an iPad asking for the desktop site", () => {
    expect(detectAppPlatform(MAC, 5)).toBe("ios");
  });
});

describe("appStoreRedirectUrl", () => {
  test("sends an iPhone to the App Store", () => {
    expect(appStoreRedirectUrl("ios")).toBe(APP_STORE_URL);
  });

  test("gives Android an intent that opens the app, or Google Play without it", () => {
    const url = appStoreRedirectUrl("android", "/open/plan/123?ref=qr");

    expect(url).toMatch(
      /^intent:\/\/webuddhist\.com\/open\/plan\/123\?ref=qr#Intent;/,
    );
    expect(url).toContain("scheme=https;");
    expect(url).toContain("package=org.pecha.app;");
    expect(url).toContain(
      `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`,
    );
  });

  test("leaves a computer where it is", () => {
    expect(appStoreRedirectUrl(null)).toBeNull();
  });
});
