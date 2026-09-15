export { libraryClient, LibraryError, isNotFound } from "./client.ts";
export * from "./types.ts";
export { extractTitle } from "./mappers.ts";
export {
  getTextsByCollection,
  getTextById,
  searchTitles,
  getTextVersions,
  getTextVersionsByEdition,
  getTextVersionsByLanguage,
  getTextLanguages,
  getTextCommentaries,
  getTextCommentariesByEdition,
  resolveTextId,
} from "./texts.ts";
export { getTextDetails, clearSegmentIndexCache } from "./textDetails.ts";
export {
  getSegmentById,
  getSegmentInfo,
  getSegmentTranslations,
  getSegmentCommentaries,
  getSegmentRootText,
} from "./segments.ts";
export { getCollections } from "./collections.ts";
export { getTableOfContents } from "./tableOfContents.ts";
export type { TableOfContentsResponse, TocSection } from "./tableOfContents.ts";
export { multilingualSearch } from "./search.ts";
export type {
  MultilingualSearchResponse,
  MultilingualSourceResult,
  MultilingualSegmentMatch,
  TextIndex,
} from "./search.ts";
export { clearAlignmentCache } from "./alignments.ts";
export { fetchEditionRecordings, recordingAudioUrl } from "./api.ts";
