import axiosInstance from "../../../config/axios-config.ts";
import type { VerseOfDayPublicResponse } from "../../planviewer/types.ts";

/** The verse published for one calendar day (`YYYY-MM-DD`), if any. */
export async function fetchVerseOfDayByDate(
  date: string,
  lang: string,
): Promise<VerseOfDayPublicResponse> {
  const { data } = await axiosInstance.get<VerseOfDayPublicResponse>(
    "/api/v1/verse-of-day",
    { params: { date, lang } },
  );
  return data;
}
