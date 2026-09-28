import axiosInstance from "../../../config/axios-config.ts";
import type { EventDTO } from "../types.ts";

/**
 * Featured events. The endpoint takes the caller's token when there is one, so
 * `is_joined` comes back filled in for a signed-in visitor and null otherwise -
 * the axios instance attaches the header, so nothing is needed here.
 */
export async function fetchFeaturedEvents(
  language: string,
  limit = 20,
): Promise<EventDTO[]> {
  const { data } = await axiosInstance.get<EventDTO[]>(
    "/api/v1/events/featured",
    { params: { language, limit } },
  );
  return data;
}

export async function fetchEventById(
  eventId: string,
  language: string,
): Promise<EventDTO> {
  const { data } = await axiosInstance.get<EventDTO>(
    `/api/v1/events/${eventId}`,
    { params: { language } },
  );
  return data;
}
