import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsMobile } from "./use-mobile.ts";

const setWidth = (width: number) =>
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

describe("useIsMobile", () => {
  const original = window.innerWidth;
  afterEach(() => setWidth(original));

  it("knows a phone on its very first render", () => {
    setWidth(375);
    const firstRenders: boolean[] = [];

    renderHook(() => {
      const isMobile = useIsMobile();
      firstRenders.push(isMobile);
      return isMobile;
    });

    // Never false on a phone, not even before the effect runs.
    expect(firstRenders[0]).toBe(true);
    expect(firstRenders.every(Boolean)).toBe(true);
  });

  it("is false on a wide screen", () => {
    setWidth(1280);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
