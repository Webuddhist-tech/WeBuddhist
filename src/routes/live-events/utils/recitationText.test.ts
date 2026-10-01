import { describe, expect, it } from "vitest";
import type { LiveRecitationText } from "../types.ts";
import { recitationLines, segmentPlainText } from "./recitationText.ts";

const text: LiveRecitationText = {
  text_id: "text-1",
  title: "Praise to the Twenty-One Taras",
  language: "bo",
  segments: [
    {
      recitation: { bo: { id: "bo-1", content: "ཨོཾ་<br>ཇེ་བཙུན་མ།" } },
      translations: {
        en: { id: "en-1", content: "<b>Om</b>, to the noble lady" },
        zh: { id: "zh-1", content: "嗡" },
      },
    },
    {
      recitation: { bo: { id: "bo-2", content: "ཕྱག་འཚལ།" } },
      translations: {},
    },
  ],
};

describe("segmentPlainText", () => {
  it("keeps line breaks and drops every other tag", () => {
    expect(segmentPlainText("one<br/>two <i>three</i>")).toBe("one\ntwo three");
  });

  it("never hands markup on as markup", () => {
    expect(segmentPlainText('<img src=x onerror="alert(1)">safe')).toBe("safe");
  });

  it("is empty for nothing", () => {
    expect(segmentPlainText(null)).toBe("");
  });
});

describe("recitationLines", () => {
  it("matches a line by any of its segment ids, in any language", () => {
    const { lineBySegmentId } = recitationLines(text, "en");

    expect(lineBySegmentId.get("bo-1")).toBe(0);
    expect(lineBySegmentId.get("en-1")).toBe(0);
    expect(lineBySegmentId.get("zh-1")).toBe(0);
    expect(lineBySegmentId.get("bo-2")).toBe(1);
  });

  it("shows the recited line with the reader's own translation", () => {
    const { lines } = recitationLines(text, "en");

    expect(lines[0]).toEqual({
      recited: "ཨོཾ་\nཇེ་བཙུན་མ།",
      translation: "Om, to the noble lady",
    });
    expect(lines[1].translation).toBeNull();
  });

  it("shows no translation to a reader of the recited language", () => {
    const { lines } = recitationLines(text, "bo");

    expect(lines[0].translation).toBeNull();
  });

  it("is empty before a text has loaded", () => {
    const { lines, lineBySegmentId } = recitationLines(undefined, "en");

    expect(lines).toEqual([]);
    expect(lineBySegmentId.size).toBe(0);
  });
});
