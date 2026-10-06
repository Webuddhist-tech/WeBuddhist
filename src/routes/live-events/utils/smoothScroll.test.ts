import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { smoothScrollTo } from "./smoothScroll.ts";

describe("smoothScrollTo", () => {
  let frames: FrameRequestCallback[];

  const runFrame = (now: number) => {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(now));
  };

  beforeEach(() => {
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      frames = [];
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("glides there, slowly at both ends", () => {
    const element = document.createElement("div");
    element.scrollTop = 0;

    smoothScrollTo(element, 1000, 1000);
    runFrame(0);
    expect(element.scrollTop).toBe(0);
    runFrame(100);
    const early = element.scrollTop;
    runFrame(500);
    expect(element.scrollTop).toBe(500);
    runFrame(1000);
    expect(element.scrollTop).toBe(1000);

    // The first tenth of the time covers far less than a tenth of the way.
    expect(early).toBeLessThan(100);
    expect(frames).toHaveLength(0);
  });

  it("stops where it is when cancelled", () => {
    const element = document.createElement("div");

    const cancel = smoothScrollTo(element, 1000, 1000);
    runFrame(0);
    runFrame(500);
    cancel();
    runFrame(1000);

    expect(element.scrollTop).toBe(500);
  });

  it("goes straight there for a reader who asks for less motion", () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({ matches: query.includes("reduce") }) as MediaQueryList,
    );
    const element = document.createElement("div");

    smoothScrollTo(element, 640, 1000);

    expect(element.scrollTop).toBe(640);
    expect(frames).toHaveLength(0);
  });
});
