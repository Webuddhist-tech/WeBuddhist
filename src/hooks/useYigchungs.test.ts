import { describe, test, expect } from "vitest";
import { hasYigchungs, yigchungsQueryKey } from "./useYigchungs.ts";

describe("yigchungsQueryKey", () => {
  test("is stable for the same text id", () => {
    expect(yigchungsQueryKey("text-1")).toEqual(yigchungsQueryKey("text-1"));
    expect(yigchungsQueryKey("text-1")).not.toEqual(
      yigchungsQueryKey("text-2"),
    );
    expect(yigchungsQueryKey("text-1", false)).not.toEqual(
      yigchungsQueryKey("text-1", true),
    );
  });
});

describe("hasYigchungs", () => {
  test("is false when data is missing or empty", () => {
    expect(hasYigchungs(undefined)).toBe(false);
    expect(hasYigchungs({ items: [], text_detail: null })).toBe(false);
  });

  test("is true when at least one yigchung item exists", () => {
    expect(
      hasYigchungs({
        items: [
          {
            id: "y1",
            index: 0,
            label: "1",
            span: { start: 0, end: 1 },
            content: "a",
          },
        ],
        text_detail: null,
      }),
    ).toBe(true);
  });
});
