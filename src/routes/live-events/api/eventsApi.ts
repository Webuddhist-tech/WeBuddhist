import { isAxiosError } from "axios";
import axiosInstance from "../../../config/axios-config.ts";
import type {
  EventDTO,
  LiveRecitationText,
  RecitationTextDTO,
} from "../types.ts";

/**
 * Featured events. The endpoint takes the caller's token when there is one, so
 * `is_joined` comes back filled in for a signed-in visitor and null otherwise -
 * the axios instance attaches the header, so nothing is needed here.
 */
export const fetchFeaturedEvents = async (
  language: string,
  limit = 20,
): Promise<EventDTO[]> => {
  const { data } = await axiosInstance.get<EventDTO[]>(
    "/api/v1/events/featured",
    { params: { language, limit } },
  );
  return data;
};

export const fetchEventById = async (
  eventId: string,
  language: string,
): Promise<EventDTO> => {
  const { data } = await axiosInstance.get<EventDTO>(
    `/api/v1/events/${eventId}`,
    { params: { language } },
  );
  return data;
};

/** Every language the site offers; a liturgy is asked for in all of them. */
const RECITATION_LANGUAGES = ["bo", "en", "zh"];

const isNotFound = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 404;

/**
 * A liturgy the live recitation has moved to, with every line aligned across
 * languages.
 *
 * The recited line is asked for in Tibetan first - what a puja is chanted in -
 * and the reader's language after that, since the endpoint 404s a text with no
 * edition in the language asked for. Translations come in every site language,
 * not only the reader's: the operator may be clicking through any edition, and
 * the page can only follow a segment id it has been given.
 */
export const fetchRecitationText = async (
  textId: string,
  readerLanguage: string,
): Promise<LiveRecitationText> => {
  const roots = [...new Set(["bo", readerLanguage, "en"])];
  let lastError: unknown = null;

  for (const language of roots) {
    try {
      const { data } = await axiosInstance.post<RecitationTextDTO>(
        `/api/v1/recitations/${encodeURIComponent(textId)}`,
        {
          language,
          recitation: [language],
          translations: RECITATION_LANGUAGES.filter(
            (code) => code !== language,
          ),
        },
      );
      return { ...data, language };
    } catch (error) {
      if (!isNotFound(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
};
