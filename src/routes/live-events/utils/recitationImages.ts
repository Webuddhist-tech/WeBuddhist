import type { RecitationLine } from "./recitationText.ts";

export type RecitationImage = {
  /** A stretch of the recited Tibetan that identifies the verse. */
  match: string;
  src: string;
  alt: string;
  label: { en: string; bo: string };
};

/** The 21 Tara praise verses, each with its portrait (from the puja controller). */
export const RECITATION_IMAGES: RecitationImage[] = [
  {
    match: "ཕྱག་འཚལ་སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ། །",
    src: "/img/recitation/taras/01.webp",
    alt: "Tārā Swift and Heroic",
    label: { en: "Tara 1 of 21", bo: "སྒྲོལ་མ་མྱུར་མ་དཔའ་མོ་" },
  },
  {
    match: "ཕྱག་འཚལ་སྟོན་ཀའི་ཟླ་བ་ཀུན་ཏུ། །",
    src: "/img/recitation/taras/02.webp",
    alt: "Tārā White as the Autumn Moon",
    label: { en: "Tara 2 of 21", bo: "སྒྲོལ་མ་འོད་དཀར་ཅན་" },
  },
  {
    match: "ཕྱག་འཚལ་སེར་སྔོ་ཆུ་ནས་སྐྱེས་ཀྱི། །",
    src: "/img/recitation/taras/03.webp",
    alt: "Golden-Coloured Tārā",
    label: { en: "Tara 3 of 21", bo: "སྒྲོལ་མ་གསེར་མདོག་ཅན་" },
  },
  {
    match: "ཕྱག་འཚལ་དེ་བཞིན་གཤེགས་པའི་གཙུག་ཏོར། །",
    src: "/img/recitation/taras/04.webp",
    alt: "Tārā of the Victorious Uṣṇīṣa",
    label: { en: "Tara 4 of 21", bo: "སྒྲོལ་མ་དེ་བཞིན་གཤེགས་པ་གཙུག་ཏོར་ཅན་" },
  },
  {
    match: "ཕྱག་འཚལ་ཏུཏྟཱ་ར་ཧཱུྂ་ཡི་གེ །",
    src: "/img/recitation/taras/05.webp",
    alt: "Tārā Proclaiming the Sound of Hūṃ",
    label: { en: "Tara 5 of 21", bo: "སྒྲོལ་མ་ཧཱུྃ་སྒྲ་སྒྲོག་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་བརྒྱ་བྱིན་མེ་ལྷ་ཚངས་པ། །",
    src: "/img/recitation/taras/06.webp",
    alt: "Tārā Victorious over the Three Worlds",
    label: { en: "Tara 6 of 21", bo: "སྒྲོལ་མ་འཇིག་རྟེན་གསུམ་རྒྱལ་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཏྲཊ་ཅེས་བྱ་དང་ཕཊ་ཀྱིས། །",
    src: "/img/recitation/taras/07.webp",
    alt: "Tārā Crushing Adversaries",
    label: { en: "Tara 7 of 21", bo: "སྒྲོལ་མ་རབ་འཇོམས་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཏུ་རེ་འཇིགས་པ་ཆེན་པོས། །",
    src: "/img/recitation/taras/08.webp",
    alt: "Tārā Who Bestows Supreme Powers",
    label: { en: "Tara 8 of 21", bo: "སྒྲོལ་མ་བདུད་འཇོམས་དབང་ཕྱུག་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་དཀོན་མཆོག་གསུམ་མཚོན་ཕྱག་རྒྱའི། །",
    src: "/img/recitation/taras/09.webp",
    alt: "Tārā Granter of Boons",
    label: { en: "Tara 9 of 21", bo: "སེང་ལྡེང་ནགས་ཀྱི་སྒྲོལ་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་རབ་ཏུ་དགའ་བ་བརྗིད་པའི། །",
    src: "/img/recitation/taras/10.webp",
    alt: "Tārā Dispeller of Sorrow",
    label: { en: "Tara 10 of 21", bo: "སྒྲོལ་མ་མྱ་ངན་སེལ་བྱེད་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ས་གཞི་སྐྱོང་བའི་ཚོགས་རྣམས། །",
    src: "/img/recitation/taras/11.webp",
    alt: "Tārā Summoner of Beings",
    label: { en: "Tara 11 of 21", bo: "སྒྲོལ་མ་འཇིག་རྟེན་དབང་སྡུད་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཟླ་བའི་དུམ་བུས་དབུ་རྒྱན། །",
    src: "/img/recitation/taras/12.webp",
    alt: "Tārā Auspiciously Shining",
    label: { en: "Tara 12 of 21", bo: "སྒྲོལ་མ་བཀྲ་ཤིས་སྣང་བ་" },
  },
  {
    match: "ཕྱག་འཚལ་བསྐལ་པ་ཐ་མའི་མེ་ལྟར། །",
    src: "/img/recitation/taras/13.webp",
    alt: "Tārā the Ripener",
    label: { en: "Tara 13 of 21", bo: "སྒྲོལ་མ་ཡོངས་སུ་སྨིན་བྱེད་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ས་གཞིའི་ངོས་ལ་ཕྱག་གི །",
    src: "/img/recitation/taras/14.webp",
    alt: "Tārā with a Frown",
    label: { en: "Tara 14 of 21", bo: "སྒྲོལ་མ་ཁྲོ་གཉེར་ཅན་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་བདེ་མ་དགེ་མ་ཞི་མ། །",
    src: "/img/recitation/taras/15.webp",
    alt: "Tārā of Great Peace",
    label: { en: "Tara 15 of 21", bo: "སྒྲོལ་མ་ཞི་བ་ཆེན་མོ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཀུན་ནས་བསྐོར་རབ་དགའ་བའི། །",
    src: "/img/recitation/taras/16.webp",
    alt: "Tārā Destroyer of Attachment",
    label: { en: "Tara 16 of 21", bo: "སྒྲོལ་མ་ཆགས་འཇོམས་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཏུ་རེའི་ཞབས་ནི་བརྡབས་པས། །",
    src: "/img/recitation/taras/17.webp",
    alt: "Tārā Accomplishing Bliss",
    label: { en: "Tara 17 of 21", bo: "སྒྲོལ་མ་སྒྲུབ་པའི་སྒྲོལ་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ལྷ་ཡི་མཚོ་ཡི་རྣམ་པའི། །",
    src: "/img/recitation/taras/18.webp",
    alt: "Victorious Liberating Tārā",
    label: { en: "Tara 18 of 21", bo: "རྣམ་པར་རྒྱལ་བའི་སྒྲོལ་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ལྷ་ཡི་ཚོགས་རྣམས་རྒྱལ་པོ། །",
    src: "/img/recitation/taras/19.webp",
    alt: "Tārā Burner of Suffering",
    label: { en: "Tara 19 of 21", bo: "སྒྲོལ་མ་སྡུག་བསྔལ་སེལ་བྱེད་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་ཉི་མ་ཟླ་བ་རྒྱས་པའི། །",
    src: "/img/recitation/taras/20.webp",
    alt: "Tārā Source of Siddhis",
    label: { en: "Tara 20 of 21", bo: "སྒྲོལ་མ་དངོས་གྲུབ་འབྱུང་གནས་མ་" },
  },
  {
    match: "ཕྱག་འཚལ་དེ་ཉིད་གསུམ་རྣམས་བཀོད་པས། །",
    src: "/img/recitation/taras/21.webp",
    alt: "Tārā the Perfecter",
    label: { en: "Tara 21 of 21", bo: "སྒྲོལ་མ་ཡོངས་སུ་རྫོགས་བྱེད་མ་" },
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
