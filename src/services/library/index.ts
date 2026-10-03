export { libraryClient, LibraryError, isNotFound } from "./client.ts";
export * from "./types.ts";
export { extractTitle } from "./mappers.ts";
export {
  getTextsByCollection,
  getTextById,
  searchTitles,
  findTextsByTitle,
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
export {
  getTableOfContents,
  getTableOfContentsOutline,
} from "./tableOfContents.ts";
export type {
  OutlineEntry,
  TableOfContentsResponse,
  TocSection,
} from "./tableOfContents.ts";
export { getYigchungs } from "./yigchungs.ts";
export { getAnnotatedSegments } from "./segmentLines.ts";
export type {
  AnnotatedLine,
  AnnotatedSegment,
  LineRun,
} from "./segmentLines.ts";
export type { YigchungItem, YigchungsResponse } from "./yigchungs.ts";
export { multilingualSearch } from "./search.ts";
export type {
  MultilingualSearchResponse,
  MultilingualSourceResult,
  MultilingualSegmentMatch,
  TextIndex,
} from "./search.ts";
export { clearAlignmentCache } from "./alignments.ts";
export { fetchEditionRecordings, recordingAudioUrl } from "./api.ts";
