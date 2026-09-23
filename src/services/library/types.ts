/**
 * Types for the library (OpenPecha) API and for the shapes this layer hands to
 * the app.
 *
 * The app-facing shapes intentionally keep the backend's snake_case field names.
 * They are what the components already render, so moving the composition into
 * the browser does not ripple through the UI.
 */

// ---------------------------------------------------------------------------
// Raw library payloads
// ---------------------------------------------------------------------------

/** Titles are keyed by language code, e.g. { en: "…", bo: "…" }. */
export type LocalizedTitle = Record<string, string>;

export type LibraryText = {
  id: string;
  title: LocalizedTitle;
  language: string;
  category_id: string;
  license?: string | null;
  bdrc?: string | null;
  wiki?: string | null;
  date?: string | null;
  alt_titles?: LocalizedTitle[] | null;
  commentary_of?: string | null;
  translation_of?: string | null;
  commentaries?: string[];
  translations?: string[];
  editions?: string[];
  contributions?: LibraryContribution[];
  /** Ids into the application's tag list; resolve labels with `getTags`. */
  tag_ids?: string[];
  /** Not part of the upstream payload; filled in from the critical edition. */
  source_link?: string | null;
};

/** The library's own ContributorRole enum. */
export type ContributorRole =
  | "translator"
  | "reviser"
  | "author"
  | "scholar"
  | "narrator";

/**
 * One credit on a text. A person carries a localized name; an AI contribution
 * carries only the model's id, so it has nothing name-like to show.
 */
export type LibraryContribution = {
  type: "person" | "ai";
  id?: string | null;
  bdrc_id?: string | null;
  role: ContributorRole;
  name?: LocalizedTitle | null;
};

export type LibraryEdition = {
  id: string;
  text_id: string;
  type?: string;
  source?: string | null;
  colophon?: string | null;
  incipit_title?: string | null;
  alt_incipit_titles?: string[] | null;
};

export type LibraryRecordingContribution = {
  type?: string;
  id?: string | null;
  bdrc_id?: string | null;
  role?: string;
  name?: LocalizedTitle | null;
};

export type LibraryRecording = {
  id: string;
  edition_id: string;
  text_id: string;
  title?: LocalizedTitle | null;
  language?: string | null;
  duration_ms?: number | null;
  contributions?: LibraryRecordingContribution[];
  format?: string;
};

export type LibrarySegmentation = {
  id: string;
  edition_id: string;
  text_id: string;
};

export type SegmentLine = {
  start: number;
  end: number;
};

export type LibrarySegmentSpan = {
  id: string;
  lines: SegmentLine[];
  type?: string;
  reference?: string | null;
};

export type LibrarySegmentDetail = LibrarySegmentSpan & {
  segmentation_id: string;
  edition_id: string;
  text_id: string;
};

export type LibraryPage<T> = {
  items: T[];
  has_more: boolean;
  offset: number;
  limit: number;
};

export type LibraryAlignmentPair = {
  source_segment: { id: string };
  target_segment: { id: string };
};

export type LibraryRelatedSegment = {
  id: string;
  text_id?: string;
  /** SegmentType: verse, paragraph, title, front_matter, back_matter, top_segment. */
  type?: string;
};

export type LibraryTag = {
  id: string;
  title: LocalizedTitle;
  description?: LocalizedTitle | null;
};

export type LibraryCategory = {
  id: string;
  title: LocalizedTitle;
  description?: LocalizedTitle | null;
  parent_id?: string | null;
  children?: LibraryCategory[];
};

// ---------------------------------------------------------------------------
// App-facing shapes (mirror the backend response models)
// ---------------------------------------------------------------------------

export type TextDTO = {
  id: string;
  pecha_text_id: string;
  title: string;
  language: string;
  group_id: string;
  type: string;
  summary: string;
  is_published: boolean;
  created_date: string;
  updated_date: string;
  published_date: string;
  published_by: string;
  categories: string[];
  views: number;
  likes: string[];
  source_link: string | null;
  ranking: number | null;
  license: string | null;
  tag_ids: string[];
  contributors: ContributorDTO[];
};

export type V2TextDTO = {
  id: string;
  title: string;
  language: string;
  license: string | null;
  tag_ids: string[];
};

/** A credit with its name already resolved for one language. */
export type ContributorDTO = {
  type: "person" | "ai";
  /** Empty for an AI contribution, and for a person the library cannot name. */
  name: string;
  role: ContributorRole;
};

/** A tag with its label already resolved for one language. */
export type TagDTO = {
  id: string;
  title: string;
  description: string | null;
};

export type TextVersion = {
  id: string;
  title: string;
  parent_id: string | null;
  priority: number | null;
  language: string;
  type: string;
  group_id: string;
  table_of_contents: string[];
  is_published: boolean;
  created_date: string;
  updated_date: string;
  published_date: string;
  published_by: string;
  source_link: string | null;
  ranking: number | null;
  license: string | null;
  is_selected: boolean;
};

export type TextVersionResponse = {
  text: TextDTO | null;
  versions: TextVersion[];
};

export type TextLanguageVersionsResponse = {
  text_id: string;
  language: string;
  available_versions: TextVersion[];
};

export type AvailableLanguage = {
  language: string;
  language_code: string;
  version_count: number;
};

export type LanguageResponse = {
  text_id: string;
  title: string;
  available_languages: AvailableLanguage[];
};

export type TitleSearchResult = {
  id: string;
  title: string;
};

export type V2CollectionModel = {
  id: string;
  title: string;
};

export type V2TextsCategoryResponse = {
  collection: V2CollectionModel | null;
  texts: V2TextDTO[];
  skip: number;
  limit: number;
  has_more: boolean;
};

export type SegmentTranslationDTO = {
  text_id: string;
  language: string;
  content: string;
};

export type SegmentDTO = {
  segment_id: string;
  segment_number: number;
  content: string;
  /** Structural role, e.g. "verse", "title", "front_matter", "colophon". */
  type?: string | null;
  /** The edition's own citation for this segment, e.g. "2-57" or "I-1". */
  reference?: string | null;
  translation?: SegmentTranslationDTO | null;
};

export type SectionDTO = {
  id: string;
  title: string;
  section_number: number;
  parent_id: string | null;
  segments: SegmentDTO[];
  sections: SectionDTO[];
  created_date: string | null;
  updated_date: string | null;
  published_date: string | null;
};

export type ContentDTO = {
  id: string;
  text_id: string;
  sections: SectionDTO[];
};

export type TextDetailDTO = TextDTO;

export type PaginationDirection = "next" | "previous";

export type TextDetailsRequest = {
  segment_id?: string | null;
  size?: number;
  direction?: PaginationDirection;
  start?: number | null;
  end?: number | null;
  version_id?: string | null;
  /** Position of `segment_id` when the caller already knows it (1-based). */
  segment_position?: number | null;
};

export type TextDetailWithContentResponse = {
  text_detail: TextDetailDTO;
  content: ContentDTO;
  size: number;
  pagination_direction: PaginationDirection;
  current_segment_position: number;
  /** Null when not known — resolving it exactly costs a full segment scan. */
  total_segments: number | null;
  has_more_up: boolean;
  has_more_down: boolean;
};

// Segment resource-panel shapes

export type ParentSegment = {
  segment_id: string;
  content: string;
};

export type V2RelatedSegmentItem = {
  id: string;
  content: string | null;
  /** SegmentType: verse, paragraph, title, front_matter, back_matter, top_segment. */
  type?: string | null;
};

export type V2SegmentTextGroup = {
  text_id: string;
  title: string;
  language: string | null;
  source_link?: string | null;
  license?: string | null;
  segments: V2RelatedSegmentItem[];
};

export type V2SegmentTranslationsResponse = {
  parent_segment: ParentSegment;
  translations: V2SegmentTextGroup[];
  skip: number;
  limit: number;
  has_more: boolean;
};

export type V2SegmentCommentariesResponse = {
  parent_segment: ParentSegment;
  commentaries: V2SegmentTextGroup[];
  skip: number;
  limit: number;
  has_more: boolean;
};

export type V2SegmentRootTextResponse = {
  parent_segment: ParentSegment;
  root_text: V2SegmentTextGroup[];
  skip: number;
  limit: number;
  has_more: boolean;
};

export type V2SegmentTextDetail = {
  text_id: string;
  title: string;
  language: string | null;
};

export type V2SegmentResponse = {
  segment_id: string;
  content: string;
  text: V2SegmentTextDetail | null;
};

export type V2SegmentInfoResponse = {
  segment_info: {
    segment_id: string;
    text_id: string;
    translations: number;
    related_text: { commentaries: number; root_text: number };
    resources: { sheets: number };
  };
};

export type CollectionModel = {
  id: string;
  pecha_collection_id: string;
  title: string;
  description: string;
  has_child: boolean;
  language: string;
  slug: string;
};

export type CollectionsResponse = {
  parent: CollectionModel | null;
  pagination: { total: number; skip: number; limit: number };
  collections: CollectionModel[];
};
