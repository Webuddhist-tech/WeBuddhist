import { describe, expect, it } from "vitest";
import {
  addPaceSample,
  chantedLength,
  lineChantedLength,
  paceOf,
  verseLineTimings,
} from "./recitationPace.ts";

const plain = (text: string) => [{ text, yigchung: false }];

describe("chantedLength", () => {
  it("counts a Tibetan stack once, and no tsheg or shad", () => {
    // སྒྲོལ = ས + subjoined ག + subjoined ར, a vowel, then ལ: two stacks.
    expect(chantedLength("སྒྲོལ་མ།")).toBe(3);
  });

  it("counts letters, not spaces or punctuation", () => {
    expect(chantedLength("Om, ah!")).toBe(4);
  });
});

describe("lineChantedLength", () => {
  it("leaves out yigchung, which is read silently", () => {
    expect(
      lineChantedLength([
        { text: "Om ah", yigchung: false },
        { text: "three times", yigchung: true },
      ]),
    ).toBe(4);
  });
});

describe("pace", () => {
  it("learns the time per character from each line the room finishes", () => {
    let samples: number[] = [];
    samples = addPaceSample(samples, {
      elapsedMs: 4000,
      characters: 40,
      lines: 1,
    });
    samples = addPaceSample(samples, {
      elapsedMs: 6000,
      characters: 50,
      lines: 1,
    });
    expect(paceOf(samples)).toBe(110);
  });

  it("is unknown before the first line is finished", () => {
    expect(paceOf([])).toBeNull();
  });

  it("ignores jumps, pauses, returns and silent lines", () => {
    const samples = [100];
    const ignored = [
      { elapsedMs: 4000, characters: 40, lines: 6 },
      { elapsedMs: 300_000, characters: 40, lines: 1 },
      { elapsedMs: 100, characters: 40, lines: 1 },
      { elapsedMs: 4000, characters: 40, lines: -2 },
      { elapsedMs: 4000, characters: 0, lines: 1 },
    ];
    for (const step of ignored) {
      expect(addPaceSample(samples, step)).toBe(samples);
    }
  });

  it("follows the room without being thrown by one odd line", () => {
    const samples = [100, 100, 100, 900].reduce<number[]>(
      (kept, msPerChar) =>
        addPaceSample(kept, {
          elapsedMs: msPerChar * 10,
          characters: 10,
          lines: 1,
        }),
      [],
    );
    expect(paceOf(samples)).toBe(100);
  });
});

describe("verseLineTimings", () => {
  it("moves down the lines in order, at the pace, skipping yigchung", () => {
    const timings = verseLineTimings(
      [
        plain("abcd"),
        [
          { text: "ef", yigchung: false },
          { text: "silent", yigchung: true },
          { text: "ghij", yigchung: false },
        ],
        [{ text: "three times", yigchung: true }],
        plain("kl"),
      ],
      100,
    );
    expect(timings).toEqual([
      { delayMs: 0, durationMs: 400 },
      { delayMs: 400, durationMs: 600 },
      null,
      { delayMs: 1000, durationMs: 200 },
    ]);
  });
});
