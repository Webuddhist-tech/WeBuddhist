import type { RecitationLine } from "./recitationText.ts";

export type RecitationImage = {
  /** A stretch of the recited Tibetan that identifies the verse. */
  match: string;
  src: string;
  alt: string;
  label: { en: string; bo: string };
};

export const RECITATION_IMAGES: RecitationImage[] = [
  {
    match: "ཕྱག་འཚལ་སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ། །",
    src: "/img/recitation/tara.jpg",
    alt: "Tara, the swift heroine",
    label: { en: "Tara 1 of 21", bo: "སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ་" },
  },
];

/** Drops spaces, tsheg, shad and other marks so editions compare equal. */
export const normalizeTibetan = (text: string): string =>
  text.replace(/[\s་༌།༎༑༔​]/g, "");

/** The image for a verse, going by the Tibetan it is recited in. */
export const imageForLine = (
  line: RecitationLine | undefined,
): RecitationImage | undefined => {
  if (!line) return undefined;
  const recited = normalizeTibetan(
    line.recited.map((run) => run.map((r) => r.text).join("")).join(""),
  );
  return RECITATION_IMAGES.find((image) =>
    recited.includes(normalizeTibetan(image.match)),
  );
};
