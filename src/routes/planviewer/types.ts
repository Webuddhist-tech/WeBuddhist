export type ImageUrlModel = {
  thumbnail?: string;
  medium?: string;
  original?: string;
};

export type SeriesMetadataDTO = {
  id: string;
  title: string;
  sub_title?: string;
  description?: string;
  language: string;
};

export type TagSummaryDTO = {
  id: string;
  name: string;
  image?: string;
  description?: string;
  featured?: boolean;
};

export type SeriesPlanDTO = {
  id: string;
  title: string;
  description?: string;
  language: string;
  difficulty_level?: string;
  image?: ImageUrlModel | null;
  tags?: TagSummaryDTO[];
  status: string;
  featured: boolean;
  display_order?: number | null;
  start_date?: string | null;
  total_days: number;
};

export type SeriesDTO = {
  id: string;
  metadata: SeriesMetadataDTO[] | SeriesMetadataDTO | null;
  image?: ImageUrlModel | null;
  featured: boolean;
  status: string;
  plans: SeriesPlanDTO[];
  total_days: number;
  enrolled_count: number;
};

export type SeriesListItemDTO = {
  id: string;
  metadata: SeriesMetadataDTO[] | SeriesMetadataDTO | null;
  image?: ImageUrlModel | null;
  featured: boolean;
  status: string;
  plan_count: number;
  total_days: number;
  enrolled_count: number;
};

export type SeriesListResponse = {
  series: SeriesListItemDTO[];
  skip: number;
  limit: number;
  total: number;
};

export type UserPlanDTO = {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty_level: string;
  image?: ImageUrlModel | null;
  started_at?: string | null;
  total_days: number;
  tags?: TagSummaryDTO[];
  start_date?: string | null;
  display_order?: number | null;
};

export type UserSeriesProgressResponse = {
  id: string;
  series_id: string;
  series_title: string;
  series_description?: string | null;
  enrolled_at: string;
  status: string;
  auto_enroll_next: boolean;
  current_plan_id?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  plans: UserPlanDTO[];
};

export type UserSeriesEnrollmentDTO = {
  id: string;
  series_id: string;
  series_title: string;
  series_description?: string | null;
  image?: ImageUrlModel | null;
  enrolled_at: string;
  status: string;
  current_plan_id?: string | null;
  current_plan_title?: string | null;
  is_completed: boolean;
  total_plans: number;
  completed_plans: number;
  progress_percentage: number;
};

export type UserSeriesEnrollmentsResponse = {
  enrollments: UserSeriesEnrollmentDTO[];
  skip: number;
  limit: number;
  total: number;
};

export type GroupInfoDTO = {
  id: string;
  title: string;
  sub_title?: string | null;
  description?: string | null;
  language: string;
};

export type VerseOfDayPublicDTO = {
  id: string;
  verses?: Record<string, string> | null;
  verse?: string | null;
  attributions?: Record<string, string> | null;
  attribution?: string | null;
  image_url?: string | null;
  ref_id?: string | null;
  ref_type?: string | null;
  date: string;
  group_info?: GroupInfoDTO[] | null;
};

export type VerseOfDayPublicResponse = {
  verse_of_day: VerseOfDayPublicDTO | null;
};

export type UserPlanDayCompletionStatus = {
  day_number: number;
  is_completed: boolean;
};

export type UserPlanDayCompletionStatusResponse = {
  days: UserPlanDayCompletionStatus[];
  start_date?: string | null;
};

/** Display payload for a subtask that points at other content (event, post, group). */
export type SubTaskReferenceDTO = {
  id: string;
  content_type: string;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  group_id?: string | null;
};

export type SubTaskDTO = {
  id: string;
  content_type: string;
  content?: string | null;
  duration?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  reference?: SubTaskReferenceDTO | null;
  display_order?: number | null;
};

export type TaskDTO = {
  id: string;
  title?: string | null;
  estimated_time?: number | null;
  display_order?: number | null;
  subtasks: SubTaskDTO[];
};

export type DailyPlanResponse = {
  plan_id: string;
  plan_title: string;
  plan_description: string;
  image?: ImageUrlModel | null;
  series?: {
    id: string;
    metadata: SeriesMetadataDTO[] | SeriesMetadataDTO | null;
    image?: ImageUrlModel | null;
  } | null;
  date: string;
  day_number: number;
  total_days: number;
  start_date: string;
  end_date: string;
  previous_date?: string | null;
  next_date?: string | null;
  previous_plan_id?: string | null;
  next_plan_id?: string | null;
  audio_url?: string | null;
  audio_duration_ms?: number | null;
  tasks: TaskDTO[];
};
