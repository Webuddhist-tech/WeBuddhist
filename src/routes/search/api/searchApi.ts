import axiosInstance from "../../../config/axios-config.ts";
import type {
  GroupMetadataDTO,
  PublicAccumulatorDTO,
} from "../../mantras/types.ts";
import type { ImageUrlModel } from "../../planviewer/types.ts";

/**
 * Searches over the WeBuddhist backend's own content - plans, mantras and
 * groups - for the search page. Texts and verses come from the OpenPecha
 * library instead (src/services/library).
 */

type SeriesPracticeItem = {
  id: string;
  type: "series";
  metadata?: {
    title?: string | null;
    sub_title?: string | null;
    description?: string | null;
    language?: string | null;
  } | null;
  image?: ImageUrlModel | null;
  plans_count?: number | null;
  enrolled_count?: number | null;
};

type PlanPracticeItem = {
  id: string;
  type: "plan";
  title?: string | null;
  image?: ImageUrlModel | null;
  enrolled_count?: number | null;
};

export type PracticeItem = SeriesPracticeItem | PlanPracticeItem;

export type PracticeSearchResponse = {
  items: PracticeItem[];
  pagination: { page: number; page_size: number; total: number };
};

/**
 * Plan series or single plans whose title or description matches. Asked for
 * one kind at a time: the endpoint's "all" tab returns series only.
 */
export async function searchPractice(params: {
  query: string;
  language: string;
  kind: "series" | "plans";
  page: number;
  pageSize: number;
}): Promise<PracticeSearchResponse> {
  const { data } = await axiosInstance.get<PracticeSearchResponse>(
    "/api/v1/practice/items",
    {
      params: {
        search: params.query,
        language: params.language,
        page: params.page,
        page_size: params.pageSize,
        tab: params.kind,
      },
    },
  );
  return data;
}

export type PlanSummary = {
  id: string;
  series_id?: string | null;
  description?: string | null;
  total_days?: number | null;
};

/**
 * A single plan's series and length. Search returns plans on their own, but
 * the plans page only opens a plan inside its series.
 */
export async function fetchPlanSummary(
  planId: string,
  language: string,
): Promise<PlanSummary> {
  const { data } = await axiosInstance.get<PlanSummary>(
    `/api/v1/plans/${planId}`,
    { params: { language } },
  );
  return data;
}

export type MantraSearchResponse = {
  accumulators: PublicAccumulatorDTO[];
  total: number;
};

/** Preset mantras whose name matches. */
export async function searchMantras(params: {
  query: string;
  language: string;
  limit: number;
  skip: number;
}): Promise<MantraSearchResponse> {
  const { data } = await axiosInstance.get<MantraSearchResponse>(
    "/api/v1/accumulators/presets",
    {
      params: {
        search: params.query,
        language: params.language,
        limit: params.limit,
        skip: params.skip,
      },
    },
  );
  return data;
}

export type GroupSearchItem = {
  id: string;
  slug: string;
  group_type: string;
  is_public: boolean;
  status?: string | null;
  avatar_url?: string | null;
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null;
  joiner_count?: number | null;
};

export type GroupSearchResponse = {
  groups: GroupSearchItem[];
  total: number;
};

/** Groups of every kind - communities and pages - whose name matches. */
export async function searchGroups(params: {
  query: string;
  language: string;
  limit: number;
  skip: number;
}): Promise<GroupSearchResponse> {
  const { data } = await axiosInstance.get<GroupSearchResponse>(
    "/api/v1/author/groups",
    {
      params: {
        search: params.query,
        language: params.language,
        limit: params.limit,
        skip: params.skip,
      },
    },
  );
  return data;
}
