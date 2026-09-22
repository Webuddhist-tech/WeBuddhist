import { describe, test, expect, beforeEach } from "vitest";
import {
  ALL_SCRIPTS,
  LOSSY_SOURCE_SCRIPTS,
  ORIGINAL_SCRIPT,
  SCRIPT_OPTIONS,
  clearTransliterationCache,
  getScriptClass,
  isScriptCode,
  isSelectableScript,
  transliterateHtml,
} from "./transliteration.ts";

describe("script options", () => {
  test("offers every script the converter supports", () => {
    expect(ALL_SCRIPTS).toHaveLength(18);
  });

  test("offers the original script first, then every script", () => {
    expect(SCRIPT_OPTIONS[0].value).toBe(ORIGINAL_SCRIPT);
    expect(SCRIPT_OPTIONS).toHaveLength(ALL_SCRIPTS.length + 1);
  });

  test("validates the values the menu can hold", () => {
    SCRIPT_OPTIONS.forEach((option) => {
      expect(isSelectableScript(option.value)).toBe(true);
    });
    ALL_SCRIPTS.forEach((option) => {
      expect(isScriptCode(option.value)).toBe(true);
    });
    expect(isScriptCode(ORIGINAL_SCRIPT)).toBe(false);
    expect(isSelectableScript("klingon")).toBe(false);
    expect(isSelectableScript(null)).toBe(false);
  });

  test("documents exactly the scripts the converter cannot read back", () => {
    const pali = "saṅghaṃ ñāṇaṃ paṭṭhāna brāhmaṇo viññūhi anuttaraṃ";
    const lossy = ALL_SCRIPTS.filter((option) => {
      const converted = transliterateHtml(pali, option.value, "ro");
      const back = transliterateHtml(converted, "ro", option.value);
      return back.toLowerCase() !== pali.toLowerCase();
    }).map((option) => option.value);
    expect(lossy.sort()).toEqual([...LOSSY_SOURCE_SCRIPTS].sort());
  });
});

describe("transliterateHtml", () => {
  beforeEach(() => {
    clearTransliterationCache();
  });

  test("converts into every supported target script", () => {
    ALL_SCRIPTS.forEach((option) => {
      const converted = transliterateHtml("santaṃ", option.value, "ro");
      expect(converted).toBeTruthy();
      if (option.value !== "ro") expect(converted).not.toBe("santaṃ");
    });
  });

  test("detects the source script when none is given", () => {
    expect(transliterateHtml("නමෝ බුද්ධාය", "ro")).toBe("Namo buddhāya");
    expect(transliterateHtml("buddho", "si")).toBe("බුද්ධො");
  });

  test("honours an explicit source script", () => {
    expect(transliterateHtml("buddho", "si", "ro")).toBe("බුද්ධො");
    expect(transliterateHtml("करणीयम्", "th", "hi")).toBe("กรณียมฺ");
  });

  test("returns the text untouched for the original target", () => {
    expect(transliterateHtml("buddho", ORIGINAL_SCRIPT)).toBe("buddho");
    expect(transliterateHtml("buddho", null)).toBe("buddho");
  });

  test("returns the text untouched when source and target match", () => {
    expect(transliterateHtml("buddho", "ro", "ro")).toBe("buddho");
  });

  test("leaves tags intact instead of transliterating them", () => {
    expect(transliterateHtml("buddho<br>dhammo", "si")).toBe("බුද්ධො<br>ධම්මො");
  });

  test("leaves tag attributes intact", () => {
    const converted = transliterateHtml(
      'buddho <span class="footnote-marker">1</span> dhammo',
      "si",
    );
    expect(converted).toContain('<span class="footnote-marker">');
    expect(converted).toContain("බුද්ධො");
    expect(converted).toContain("ධම්මො");
  });

  test("leaves character entities intact", () => {
    expect(transliterateHtml("buddho &amp; dhammo", "si")).toBe(
      "බුද්ධො &amp; ධම්මො",
    );
    expect(transliterateHtml("buddho &#8212; dhammo", "si")).toContain(
      "&#8212;",
    );
  });

  test("keeps a search highlight wrapped around the same words", () => {
    expect(transliterateHtml("evaṃ <mark>me</mark> sutaṃ", "si")).toBe(
      "එවං <mark>මෙ</mark> සුතං",
    );
  });

  test("returns markup-only and empty content untouched", () => {
    expect(transliterateHtml("", "si")).toBe("");
    expect(transliterateHtml("<br><br>", "si")).toBe("<br><br>");
    expect(transliterateHtml("   ", "si")).toBe("   ");
  });

  test("returns the original for an unsupported script", () => {
    expect(transliterateHtml("buddho", "klingon")).toBe("buddho");
    expect(transliterateHtml("buddho", "si", "klingon")).toBe("බුද්ධො");
  });

  test("is stable across repeated calls, cached and uncached", () => {
    const first = transliterateHtml("evaṃ me sutaṃ", "th");
    const cached = transliterateHtml("evaṃ me sutaṃ", "th");
    clearTransliterationCache();
    const recomputed = transliterateHtml("evaṃ me sutaṃ", "th");
    expect(cached).toBe(first);
    expect(recomputed).toBe(first);
  });

  test("caches per source and target, not per content alone", () => {
    const toSinhala = transliterateHtml("buddho", "si", "ro");
    const toThai = transliterateHtml("buddho", "th", "ro");
    expect(toSinhala).not.toBe(toThai);
  });
});

describe("getScriptClass", () => {
  test("falls back to the language's own class when not converting", () => {
    expect(getScriptClass("bo", ORIGINAL_SCRIPT)).toBe("bo-text");
    expect(getScriptClass("en", ORIGINAL_SCRIPT)).toBe("en-serif-text");
    expect(getScriptClass("bo", null)).toBe("bo-text");
  });

  test("lets the target script pick the face, whatever the language", () => {
    expect(getScriptClass("en", "si")).toBe("transliterated-text");
    expect(getScriptClass("bo", "th")).toBe("transliterated-text");
  });

  test("uses the shipped Tibetan face for Tibetan output", () => {
    expect(getScriptClass("en", "tb")).toBe("bo-text");
  });

  test("uses the serif face for Roman and Cyrillic output", () => {
    expect(getScriptClass("bo", "ro")).toBe("en-serif-text");
    expect(getScriptClass("bo", "cy")).toBe("en-serif-text");
  });
});
