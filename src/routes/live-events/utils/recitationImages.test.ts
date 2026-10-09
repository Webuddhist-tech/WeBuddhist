import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  imageForLine,
  normalizeTibetan,
  RECITATION_IMAGES,
} from "./recitationImages.ts";
import type { RecitationLine } from "./recitationText.ts";

const line = (...texts: string[]): RecitationLine => ({
  recited: texts.map((text) => [{ text, yigchung: false }]),
  translation: null,
  reference: null,
});

describe("RECITATION_IMAGES", () => {
  it("has 21 distinct Taras, each with an image on disk", () => {
    expect(RECITATION_IMAGES).toHaveLength(21);
    expect(new Set(RECITATION_IMAGES.map((i) => i.src)).size).toBe(21);
    expect(new Set(RECITATION_IMAGES.map((i) => i.match)).size).toBe(21);
    RECITATION_IMAGES.forEach((image, i) => {
      expect(image.label.en).toBe(`Tara ${i + 1} of 21`);
      expect(existsSync(`public${image.src}`)).toBe(true);
    });
  });

  it("finds each Tara by its own first line", () => {
    RECITATION_IMAGES.forEach((image) => {
      expect(imageForLine(line(image.match))).toBe(image);
    });
  });
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

  it("finds the last Tara", () => {
    expect(
      imageForLine(line("ཕྱག་འཚལ་དེ་ཉིད་གསུམ་རྣམས་བཀོད་པས། །"))?.label.en,
    ).toBe("Tara 21 of 21");
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
