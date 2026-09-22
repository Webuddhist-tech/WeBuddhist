import React, { useState, useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import { useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import { useSearchParams } from "react-router-dom";
import PaginationComponent from "../../../../../commons/pagination/PaginationComponent.tsx";
import { highlightSearchMatch } from "../../../../../../utils/highlightUtils.tsx";
import { getEarlyReturn } from "../../../../../../utils/helperFunctions.tsx";
import { usePanelContext } from "../../../../../../context/PanelContext.tsx";
import { useTransliteration } from "../../../../../../context/TransliterationContext.tsx";
import { useDebounce } from "use-debounce";
import { LANGUAGE } from "../../../../../../utils/constants.ts";
import ResourceHeader from "../common/ResourceHeader.tsx";
import { multilingualSearch } from "@/services/library";

export const fetchTextSearchResults = async (
  query: string,
  textId: string,
  skip: number,
  pagination: { limit: number; currentPage: number },
) => {
  return multilingualSearch({
    query,
    searchType: "exact",
    textId,
    limit: pagination.limit,
    skip,
  });
};

const IndividualTextSearch = ({
  onClose,
  textId: propTextId,
  handleSegmentNavigate,
  handleNavigate,
}: any) => {
  const [searchParams] = useSearchParams();
  const textId = propTextId || searchParams.get("text_id");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const { t } = useTranslate();
  const { openResourcesPanel } = usePanelContext() as any;
  const {
    displayContent,
    transliterationBelow,
    contentClass,
    transliterationClass,
  } = useTransliteration();
  const storedLanguage = localStorage.getItem(LANGUAGE);

  const [pagination, setPagination] = useState({ currentPage: 1, limit: 10 });
  const skip = useMemo(
    () => (pagination.currentPage - 1) * pagination.limit,
    [pagination],
  );

  const {
    data: searchResults,
    isLoading,
    error,
  } = useQuery(
    ["textSearch", debouncedSearchQuery, textId, skip, pagination],
    () =>
      fetchTextSearchResults(debouncedSearchQuery, textId, skip, pagination),
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!(debouncedSearchQuery.trim() !== "" && textId),
    },
  );

  const searchText = searchResults?.query || searchQuery;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }
  };
  const handlePageChange = (pageNumber: number) => {
    setPagination((prev) => ({ ...prev, currentPage: pageNumber }));
  };

  const earlyReturn = getEarlyReturn({ isLoading, error, t });

  const hasSearchQuery = debouncedSearchQuery.trim() !== "";
  // A text can have several editions, so a page of results may span more than
  // one source; flatten them and carry each source's language onto its matches.
  const segments = (searchResults?.sources ?? []).flatMap((source: any) =>
    (source.segment_matches ?? []).map((segment: any) => ({
      ...segment,
      language: source.text?.language,
    })),
  );
  // `total` counts every match, not just this page, so it is what drives paging.
  const totalPages = Math.ceil((searchResults?.total ?? 0) / pagination.limit);
  const highlightClassNames = "bg-yellow-200 px-1 rounded-sm";

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <ResourceHeader
        title={t("connection_panel.search_in_this_text")}
        onBack={handleNavigate}
        onClose={onClose}
      />
      <div className="border-b border-gray-100 px-4 py-3">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
            <BiSearch className="text-xl text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("connection_panel.search_in_this_text")}
              className={`w-full border-none bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none ${storedLanguage === "bo-IN" ? "leading-8" : ""}`}
              autoFocus
            />
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!hasSearchQuery ? null : earlyReturn ? (
          earlyReturn
        ) : !searchResults?.sources || searchResults.sources.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {t("search.zero_result", "No results to display.")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              {t("sheet.search.total")} : {searchResults.total}
            </div>

            <div className="flex flex-col gap-2">
              {segments.map((segment: any) => (
                <button
                  type="button"
                  key={segment.segment_id}
                  onClick={() => {
                    handleSegmentNavigate(segment.segment_id);
                    openResourcesPanel();
                  }}
                  className={`w-full rounded border cursor-pointer border-gray-200 bg-white p-3 text-left  transition hover:border-gray-300 hover:bg-gray-50 ${contentClass(
                    segment.language,
                  )}`}
                >
                  <p
                    className="whitespace-pre-wrap wrap-break-word text-base text-gray-900"
                    dangerouslySetInnerHTML={{
                      // Highlight first: the query is typed in the stored
                      // script, and the markers survive transliteration.
                      __html: displayContent(
                        highlightSearchMatch(
                          segment.content,
                          searchText,
                          highlightClassNames,
                        ),
                      ),
                    }}
                  />
                  {transliterationBelow(segment.content) && (
                    <p
                      className={`whitespace-pre-wrap wrap-break-word text-[0.95em] text-gray-500 ${transliterationClass}`}
                      dangerouslySetInnerHTML={{
                        __html: transliterationBelow(segment.content),
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            <PaginationComponent
              pagination={pagination}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
              setPagination={setPagination}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualTextSearch;
