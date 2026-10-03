import { Link } from "react-router-dom";
import type { TitleMatch } from "@/services/library";
import Highlighted from "./Highlighted.tsx";
import {
  NoResults,
  PREVIEW_COUNT,
  RESULT_CARD,
  ResultSkeleton,
  ShowMore,
} from "./ResultParts.tsx";
import type { CategoryResults } from "./useSearchResults.ts";

/**
 * The face to set a title in, chosen from its script rather than the text's
 * language: Sanskrit and Pali titles come in Tibetan script, Devanagari or
 * romanised (IAST), and the Tibetan face mangles the romanised ones.
 */
const titleFontClass = (title: string) => {
  if (/[ༀ-࿿]/.test(title)) return "bo-text";
  if (/[㐀-鿿]/.test(title)) return "zh-text";
  return "en-serif-text";
};

type TextResultsProps = {
  results: CategoryResults<TitleMatch>;
  query: string;
  preview?: boolean;
};

/** Texts from the library whose title, or an alternative title, matches. */
const TextResults = ({ results, query, preview }: TextResultsProps) => {
  if (results.isLoading) return <ResultSkeleton />;
  if (results.items.length === 0) return <NoResults />;
  const items = preview ? results.items.slice(0, PREVIEW_COUNT) : results.items;

  return (
    <div className="space-y-3">
      {items.map((match) => (
        <Link
          key={match.id}
          to={`/texts/${match.id}?type=root_text`}
          className={`${RESULT_CARD} flex items-start justify-between gap-4`}
        >
          <div className="min-w-0">
            <p
              className={`text-lg text-primary group-hover:underline ${titleFontClass(match.title)}`}
            >
              <Highlighted text={match.title} query={query} />
            </p>
            {match.matchedTitle && (
              <p className="mt-1 text-sm text-faded-grey">
                <Highlighted text={match.matchedTitle} query={query} />
              </p>
            )}
          </div>
          <span className="mt-1 shrink-0 rounded bg-search-background px-1.5 py-0.5 text-xs font-medium uppercase text-faded-grey">
            {match.language}
          </span>
        </Link>
      ))}
      {!preview && results.hasMore && (
        <ShowMore
          onClick={results.loadMore}
          isLoading={results.isLoadingMore}
        />
      )}
    </div>
  );
};

export default TextResults;
