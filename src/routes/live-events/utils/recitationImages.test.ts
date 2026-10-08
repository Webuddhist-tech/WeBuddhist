import { describe, expect, it } from "vitest";
import { imageForLine, normalizeTibetan } from "./recitationImages.ts";
import type { RecitationLine } from "./recitationText.ts";

const line = (...texts: string[]): RecitationLine => ({
  recited: texts.map((text) => [{ text, yigchung: false }]),
  translation: null,
  reference: null,
});

describe("imageForLine", () => {
  it("matches the Tara verse", () => {
    const found = imageForLine(
      line(
        "ཕྱག་འཚལ་སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ། །",
        "སྤྱན་ནི་སྐད་ཅིག་གློག་དང་འདྲ་མ། །",
      ),
    );
    expect(found?.label.en).toBe("Tara 1 of 21");
  });

  it("ignores shad and tsheg differences", () => {
    expect(imageForLine(line("ཕྱག འཚལ སྒྲོལ མ མྱུར མ དཔའ མོ"))).toBeDefined();
  });

  it("does not match other verses or empty lines", () => {
    expect(imageForLine(line("སངས་རྒྱས་ཆོས་དང་"))).toBeUndefined();
    expect(imageForLine(undefined)).toBeUndefined();
  });

  it("normalizes marks", () => {
    expect(normalizeTibetan("ཀ་ ཁ། །")).toBe("ཀཁ");
  });
});
