import { BsFileDiff, BsShare } from "react-icons/bs";

export const LOGGED_IN_VIA = "loggedInVia";
export const REFRESH_TOKEN = "refreshToken";
export const ACCESS_TOKEN = "accessToken";
export const RESET_PASSWORD_TOKEN = "resetPasswordToken";
export const RESET_PASSWORD = "reset-password";
export const LANGUAGE = "language";
export const LAYOUT_MODE = "layoutMode";
export const AUTO_SCROLL_SPEED = "autoScrollSpeed";
export const SECTION_TITLE_MODE = "sectionTitleMode";
export const TRANSLITERATION_SCRIPT = "transliterationScript";
export const TRANSLITERATION_MODE = "transliterationMode";
export const siteName = "WeBuddhist";
export const siteDescription =
  "We are Buddhist. We learn, practice and connect. Daily.";
export const USERBACK_ID = "A-JldUwSRlsuKf8Te85bql54w7U";
export const CLARITY_PROJECT_ID = "xlscfcpnox";

//for app open banner
export const APP_SCHEME_URL = "webuddhist://home";
export const APP_PACKAGE_NAME = "org.pecha.app";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=org.pecha.app";
export const APP_STORE_URL =
  "https://apps.apple.com/in/app/webuddhist/id6745810914";
export const DISMISS_KEY = "wb_banner_dismissed";
export const DISMISS_TIME_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export const MENU_ITEMS = [
  {
    icon: BsFileDiff,
    label: "connection_panel.compare_text",
  },
  {
    icon: BsShare,
    label: "common.share",
  },
];

export const SOURCE_TRANSLATION_OPTIONS_MAPPER = {
  source: "SOURCE",
  translation: "TRANSLATION",
  source_translation: "SOURCE_TRANSLATION",
};

// Maps an ISO 639-1 language code to its Tolgee label key. Keep in sync with the
// `language.*` keys in src/i18n — the API can return any of these codes.
export const languageMap = {
  ar: "language.arabic",
  bg: "language.bulgarian",
  bn: "language.bengali",
  bo: "language.tibetan",
  bs: "language.bosnian",
  cs: "language.czech",
  cy: "language.welsh",
  da: "language.danish",
  de: "language.german",
  dz: "language.bhutanese",
  el: "language.greek",
  en: "language.english",
  eo: "language.esperanto",
  es: "language.spanish",
  et: "language.estonian",
  eu: "language.basque",
  fa: "language.persian",
  fi: "language.finnish",
  fo: "language.faroese",
  fr: "language.french",
  fy: "language.frisian",
  ga: "language.irish",
  gl: "language.galician",
  gu: "language.gujarati",
  he: "language.hebrew",
  hi: "language.hindi",
  hr: "language.croatian",
  hu: "language.hungarian",
  hy: "language.armenian",
  id: "language.indonesian",
  is: "language.icelandic",
  it: "language.italian",
  ja: "language.japanese",
  ka: "language.georgian",
  kk: "language.kazakh",
  kl: "language.greenlandic",
  km: "language.khmer",
  kn: "language.kannada",
  ko: "language.korean",
  lad: "language.ladino",
  lo: "language.laotian",
  lt: "language.lithuanian",
  lv: "language.latvian",
  mk: "language.macedonian",
  ml: "language.malayalam",
  mn: "language.mongolian",
  mr: "language.marathi",
  ms: "language.malay",
  mt: "language.maltese",
  my: "language.burmese",
  ne: "language.nepali",
  nl: "language.dutch",
  no: "language.norwegian",
  oc: "language.occitan",
  pa: "language.punjabi",
  pl: "language.polish",
  pt: "language.portuguese",
  ro: "language.romanian",
  ru: "language.russian",
  sa: "language.sanskrit",
  sco: "language.scots",
  se: "language.sami",
  si: "language.sinhala",
  sk: "language.slovak",
  sl: "language.slovenian",
  sq: "language.albanian",
  sr: "language.serbian",
  sv: "language.swedish",
  ta: "language.tamil",
  te: "language.telugu",
  th: "language.thai",
  tr: "language.turkish",
  tt: "language.tatar",
  ur: "language.urdu",
  uz: "language.uzbek",
  vi: "language.vietnamese",
  yi: "language.yiddish",
  zh: "language.chinese",

  // Non-standard codes still emitted by older content.
  bhu: "language.bhutanese",
  mo: "language.mongolian",
  sp: "language.spanish",
  tib: "language.tibetan",
  tibphono: "language.tibetan",
};
