import { useQuery, type UseQueryResult } from "react-query";
import { getYigchungs, type YigchungsResponse } from "@/services/library";

export type UseYigchungsOptions = {
  /** Load note text and anchor segments (for the panel). Default false for chapter availability checks. */
  includeContent?: boolean;
};

/**
 * Yigchung mark annotations for an edition (marginal / short notes in the library).
 */
export const yigchungsQueryKey = (
  textId?: string | null,
  includeContent = false,
) => ["yigchungs", textId, includeContent ? "full" : "meta"];

export const useYigchungs = (
  textId?: string | null,
  options: UseYigchungsOptions = {},
): UseQueryResult<YigchungsResponse> => {
  const includeContent = options.includeContent ?? false;
  return useQuery<YigchungsResponse>(
    yigchungsQueryKey(textId, includeContent),
    () => getYigchungs(textId as string, { includeContent }),
    {
      enabled: !!textId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 20,
      retry: false,
    },
  );
};

export const hasYigchungs = (data: YigchungsResponse | undefined): boolean =>
  (data?.items?.length ?? 0) > 0;
