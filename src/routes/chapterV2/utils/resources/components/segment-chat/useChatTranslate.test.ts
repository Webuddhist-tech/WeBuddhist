import { beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChatTranslate } from "./useChatTranslate.ts";
import localeEn from "@/i18n/en.json";
import localeBoIn from "@/i18n/bo-IN.json";

let language = "en";
// Stands in for Tolgee: returns the CDN translation when it has one,
// otherwise the default it was given (with {params} filled in).
let cdn: Record<string, string> = {};
const t = vi.fn(
  (key: string, fallback: string, params?: Record<string, unknown>) => {
    const text = cdn[key] ?? fallback;
    return params
      ? text.replace(/\{(\w+)\}/g, (_, name) => String(params[name]))
      : text;
  },
);

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({ t }),
  useTolgee: () => ({ getLanguage: () => language }),
}));

describe("useChatTranslate", () => {
  beforeEach(() => {
    language = "en";
    cdn = {};
    t.mockClear();
  });

  test("falls back to the English file", () => {
    const { result } = renderHook(() => useChatTranslate());
    expect(result.current("segment_chat.open")).toBe("Ask about this verse");
  });

  test("falls back to the Tibetan file for bo-IN", () => {
    language = "bo-IN";
    const { result } = renderHook(() => useChatTranslate());
    expect(result.current("segment_chat.open")).toBe(
      (localeBoIn as Record<string, string>)["segment_chat.open"],
    );
  });

  test("passes params through", () => {
    language = "bo-IN";
    const { result } = renderHook(() => useChatTranslate());
    expect(result.current("segment_chat.sources_count", { count: 3 })).toBe(
      "ཁུངས། (3)",
    );
  });

  test("prefers the Tolgee translation once it exists", () => {
    cdn = { "segment_chat.open": "From Tolgee" };
    const { result } = renderHook(() => useChatTranslate());
    expect(result.current("segment_chat.open")).toBe("From Tolgee");
  });

  test("uses English for a language without a local file", () => {
    language = "zh";
    const { result } = renderHook(() => useChatTranslate());
    expect(result.current("segment_chat.title")).toBe(
      (localeEn as Record<string, string>)["segment_chat.title"],
    );
  });

  test("every chat key has a Tibetan translation", () => {
    const chatKeys = Object.keys(localeEn).filter((key) =>
      key.startsWith("segment_chat."),
    );
    const missing = chatKeys.filter(
      (key) => !(localeBoIn as Record<string, string>)[key],
    );
    expect(chatKeys.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});
