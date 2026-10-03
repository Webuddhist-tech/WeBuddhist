import { describe, expect, it } from "vitest";
import type { LiveRecitationText } from "../types.ts";
import {
  annotationSegmentIds,
  recitationLines,
  segmentPlainText,
} from "./recitationText.ts";

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

const plain = (value: string) => [{ text: value, yigchung: false }];

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
      recited: [plain("ཨོཾ་"), plain("ཇེ་བཙུན་མ།")],
      translation: [plain("Om, to the noble lady")],
      reference: null,
    });
    expect(lines[1].translation).toBeNull();
  });

  it("shows no translation to a reader of the recited language", () => {
    const { lines } = recitationLines(text, "bo");

    expect(lines[0].translation).toBeNull();
  });

  it("breaks a segment where the library's lines do, with its yigchung marked", () => {
    const annotated: LiveRecitationText = {
      ...text,
      annotations: new Map([
        [
          "bo-1",
          {
            lines: [
              plain("ཨོཾ།"),
              [
                { text: "ཇེ་བཙུན་མ།", yigchung: false },
                { text: "ལན་གསུམ།", yigchung: true },
              ],
            ],
            reference: "I-1",
            type: "front_matter",
          },
        ],
        [
          "en-1",
          {
            lines: [plain("Om,"), plain("to the noble lady")],
            reference: "I-1",
            type: "front_matter",
          },
        ],
      ]),
    };

    const { lines } = recitationLines(annotated, "en");

    expect(lines[0].recited).toEqual([
      plain("ཨོཾ།"),
      [
        { text: "ཇེ་བཙུན་མ།", yigchung: false },
        { text: "ལན་གསུམ།", yigchung: true },
      ],
    ]);
    expect(lines[0].translation).toEqual([
      plain("Om,"),
      plain("to the noble lady"),
    ]);
    expect(lines[0].reference).toBe("I-1");
    // A segment the library could not place keeps the endpoint's own text.
    expect(lines[1].recited).toEqual([plain("ཕྱག་འཚལ།")]);
  });

  it("is empty before a text has loaded", () => {
    const { lines, lineBySegmentId } = recitationLines(undefined, "en");

    expect(lines).toEqual([]);
    expect(lineBySegmentId.size).toBe(0);
  });
});

describe("annotationSegmentIds", () => {
  it("asks for the recited edition and the reader's translation", () => {
    expect(annotationSegmentIds(text, "en")).toEqual([
      ["bo-1", "bo-2"],
      ["en-1"],
    ]);
  });

  it("asks for the recited edition alone when the reader reads it", () => {
    expect(annotationSegmentIds(text, "bo")).toEqual([["bo-1", "bo-2"]]);
  });

  it("asks for nothing in a language no line is translated into", () => {
    expect(annotationSegmentIds(text, "fr")).toEqual([["bo-1", "bo-2"]]);
  });
});
