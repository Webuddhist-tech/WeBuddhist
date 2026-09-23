import { useMemo } from "react";
import { useQuery } from "react-query";
import { useTolgee } from "@tolgee/react";
import { Badge } from "@/components/ui/badge";
import { getTags } from "@/services/library";
import type { TagDTO } from "@/services/library";
import {
  getLanguageClass,
  mapLanguageCode,
} from "../../../utils/helperFunctions.tsx";

/**
 * The library's tag list, keyed by id and resolved for the reader's language.
 *
 * Every card on a listing asks for it, but they all share one react-query key,
 * so it is fetched once and served from the cache after that.
 */
export const useTagsById = () => {
  const tolgee = useTolgee(["language"]);
  const language = mapLanguageCode(tolgee.getLanguage() || "en");

  const { data } = useQuery(
    ["library-tags", language],
    () => getTags(language),
    { refetchOnWindowFocus: false, staleTime: Infinity, retry: false },
  );

  const tagsById = useMemo(
    () => new Map((data ?? []).map((tag) => [tag.id, tag])),
    [data],
  );

  return { tagsById, language };
};

type TextTagsProps = {
  tagIds?: string[] | null;
  className?: string;
};

/**
 * Labels for a text's tags.
 *
 * Ids the tag list does not know about are dropped rather than shown raw - a
 * bare id tells a reader nothing - and a text with no tags renders nothing.
 * The labels come localised from the library, so they carry the UI language's
 * script class rather than the text's.
 */
const TextTags = ({ tagIds, className = "" }: TextTagsProps) => {
  const { tagsById, language } = useTagsById();

  const labels = (tagIds ?? [])
    .map((id) => tagsById.get(id))
    .filter((tag): tag is TagDTO => Boolean(tag?.title));

  if (labels.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {labels.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className={`${getLanguageClass(language)} bg-gray-100 text-gray-600 font-normal`}
        >
          {tag.title}
        </Badge>
      ))}
    </div>
  );
};

export default TextTags;
