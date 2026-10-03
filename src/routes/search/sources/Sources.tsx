import { useMemo, useState } from "react";
import { useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import PaginationComponent from "../../commons/pagination/PaginationComponent.tsx";
import { highlightSearchMatch } from "../../../utils/highlightUtils.tsx";
import {
  getLanguageClass,
  getSearchErrorMessage,
} from "../../../utils/helperFunctions.tsx";
import { multilingualSearch } from "@/services/library";
import {
  NoResults,
  PREVIEW_COUNT,
  ResultSkeleton,
} from "../results/ResultParts.tsx";

type SegmentMatch = {
  segment_id: string;
  content: string;
};

type SourceText = {
  text_id: string;
  title: string;
  published_date: string;
  language: string;
};

type SourceItem = {
  text: SourceText;
  segment_matches: SegmentMatch[];
};

type SourceResponse = {
  query: string;
  total: number;
  sources: SourceItem[];
};

export const fetchSources = async (
  query: string,
  skip: number,
  pagination: { limit: number },
): Promise<SourceResponse> => {
  return multilingualSearch({
    query,
    searchType: "exact",
    limit: pagination.limit,
    skip,
  });
};

type SourcesProps = {
  query: string;
  /** Collapsed: a few texts, two verses each, no paging. */
  preview?: boolean;
};

/** Verses inside texts that match the search, grouped by text. */
const Sources = ({ query: stringq, preview = false }: SourcesProps) => {
  const { t } = useTranslate();
  const navigate = useNavigate();

  const [pagination, setPagination] = useState({ currentPage: 1, limit: 10 });
  const skip = useMemo(
    () => (pagination.currentPage - 1) * pagination.limit,
    [pagination],
  );
  const {
    data: sourceData,
    isLoading,
    error,
  } = useQuery<SourceResponse, any>(
    ["sources", stringq, skip, pagination],
    () => fetchSources(stringq, skip, pagination),
    {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );
  const searchText = sourceData?.query || stringq;

  if (isLoading)
    return (
      <div>
        <span className="sr-only">{t("common.loading")}</span>
        <ResultSkeleton />
      </div>
    );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-base text-faded-grey">
          {getSearchErrorMessage(error, t)}
        </p>
      </div>
    );
  }
  if (!sourceData?.sources || sourceData.sources.length === 0) {
    return <NoResults />;
  }
  // Paging is by segment match, not by source: the API slices the ranked list of
  // matches and only then groups them under their texts. Dividing the grouped
  // sources on this page by the limit gave 1 whenever a page held fewer than
  // `limit` groups - which is almost always - so later matches were unreachable
  // even though the total above reported them. `total` counts every match.
  const totalPages = Math.ceil((sourceData.total ?? 0) / pagination.limit);
  const handlePageChange = (pageNumber: number) => {
    setPagination((prev) => ({ ...prev, currentPage: pageNumber }));
  };
  const sources = preview
    ? sourceData.sources.slice(0, PREVIEW_COUNT)
    : sourceData.sources;
  return (
    <div className="space-y-3">
      {!preview && (
        <p className="text-sm text-faded-grey">
          {t("sheet.search.total")} : {sourceData.total}
        </p>
      )}

      {sources.map((source: SourceItem) => (
        <div
          key={source.text.text_id}
          className={`space-y-2 rounded-xl border border-custom-border p-4 sm:p-5 ${getLanguageClass(source.text.language)}`}
        >
          <h4 className="text-lg font-semibold text-primary">
            {source.text.title}
          </h4>
          {source.text.published_date && (
            <span className="block text-sm text-faded-grey">
              {source.text.published_date}
            </span>
          )}

          <div className="flex flex-col space-y-3.5">
            {(preview
              ? source.segment_matches.slice(0, 2)
              : source.segment_matches
            ).map((segment: SegmentMatch) => (
              <button
                type="button"
                key={segment.segment_id}
                className="relative rounded border-0 bg-transparent pl-4 text-left cursor-pointer before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:rounded-full before:bg-rose-600 before:content-[''] hover:bg-search-background [&_.highlighted-text]:bg-yellow-200 [&_.highlighted-text]:px-0.5"
                onClick={() => {
                  if (segment.segment_id && source.text?.text_id) {
                    navigate(
                      `/chapter?text_id=${source.text.text_id}&segment_id=${segment.segment_id}&versionId=`,
                    );
                  }
                }}
              >
                <p
                  className="m-0 text-base leading-relaxed text-primary/80"
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchMatch(
                      segment.content,
                      searchText,
                      "highlighted-text",
                    ),
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      ))}

      {!preview && (
        <PaginationComponent
          pagination={pagination}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
          setPagination={setPagination}
        />
      )}
    </div>
  );
};

export default Sources;
