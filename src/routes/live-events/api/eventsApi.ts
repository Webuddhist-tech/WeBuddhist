import { isAxiosError } from "axios";
import axiosInstance from "../../../config/axios-config.ts";
import { getAnnotatedSegments } from "@/services/library/segmentLines.ts";
import type { AnnotatedSegment } from "@/services/library/segmentLines.ts";
import type {
  EventDTO,
  EventLiturgy,
  LiveRecitationText,
  RecitationTextDTO,
} from "../types.ts";
import { annotationSegmentIds } from "../utils/recitationText.ts";

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

/**
 * Long enough for the library's few round trips, short enough that a stalled
 * one cannot keep the text being recited off the screen.
 */
const ANNOTATION_TIMEOUT_MS = 6000;

const isNotFound = (error: unknown): boolean =>
  isAxiosError(error) && error.response?.status === 404;

/**
 * The library's line breaks and yigchung marks for the editions a reader sees:
 * the recited one and their translation. Each edition stands alone, and none
 * of it is required - a text the library cannot place, or one it is slow to
 * answer for, is shown as the recitation endpoint sent it.
 */
export const fetchRecitationAnnotations = async (
  text: Pick<LiveRecitationText, "segments" | "language">,
  readerLanguage: string,
): Promise<Map<string, AnnotatedSegment>> => {
  const annotations = new Map<string, AnnotatedSegment>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ANNOTATION_TIMEOUT_MS);
  });

  const editions = await Promise.race([
    Promise.allSettled(
      annotationSegmentIds(text, readerLanguage).map(getAnnotatedSegments),
    ),
    timeout,
  ]);
  clearTimeout(timer);

  for (const edition of editions ?? []) {
    if (edition.status !== "fulfilled") continue;
    edition.value.forEach((segment, id) => annotations.set(id, segment));
  }
  return annotations;
};

/**
 * A liturgy the live recitation has moved to, with every line aligned across
 * languages.
 *
 * The recited line is asked for in Tibetan first - what a puja is chanted in -
 * and the reader's language after that, since the endpoint 404s a text with no
 * edition in the language asked for. Translations come in every site language,
 * not only the reader's: the operator may be clicking through any edition, and
 * the page can only follow a segment id it has been given.
 *
 * The endpoint runs each verse's lines together, so the text arrives with the
 * library's annotations for it, and is not shown until they have come or been
 * given up on - a verse that reflows into four lines under the reader's eyes
 * loses their place.
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
      const text = { ...data, language };
      const annotations = await fetchRecitationAnnotations(
        text,
        readerLanguage,
      );
      return { ...text, annotations };
    } catch (error) {
      if (!isNotFound(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
};

type RecitationCollectionDTO = {
  items?: { text_id: string; title?: string | null; display_order: number }[];
};

/**
 * The liturgies of an event's order of service, in the order they are
 * recited - the list the live controller drives the room through.
 */
export const fetchEventLiturgies = async (
  collectionId: string,
): Promise<EventLiturgy[]> => {
  const { data } = await axiosInstance.get<RecitationCollectionDTO>(
    `/api/v1/author/groups/recitation-collections/${encodeURIComponent(collectionId)}`,
  );
  return [...(data?.items ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map((item) => ({
      textId: item.text_id,
      title: item.title?.trim() || item.text_id,
    }));
};
