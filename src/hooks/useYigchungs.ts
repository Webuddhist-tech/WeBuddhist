import { useQuery, type UseQueryResult } from "react-query";
import { getYigchungs, type YigchungsResponse } from "@/services/library";

/**
 * Yigchung mark annotations for an edition (marginal / short notes in the library).
 *
 * Shares one react-query key between the resources panel and the reader so the
 * edition is scanned once per text.
 */
export const yigchungsQueryKey = (textId?: string | null) => [
  "yigchungs",
  textId,
];

export const useYigchungs = (
  textId?: string | null,
): UseQueryResult<YigchungsResponse> =>
  useQuery<YigchungsResponse>(
    yigchungsQueryKey(textId),
    () => getYigchungs(textId as string),
    {
      enabled: !!textId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 20,
      retry: false,
    },
  );

export const hasYigchungs = (data: YigchungsResponse | undefined): boolean =>
  (data?.items?.length ?? 0) > 0;
