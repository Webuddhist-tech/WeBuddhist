import { useEffect, useMemo, useState } from "react";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { useTolgee, useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import { useParams, Link } from "react-router-dom";
import {
  getEarlyReturn,
  getLanguageClass,
  mapLanguageCode,
} from "../../utils/helperFunctions.tsx";
import Seo from "../commons/seo/Seo.tsx";
import PaginationComponent from "../commons/pagination/PaginationComponent.tsx";
import Breadcrumbs from "../commons/breadcrumbs/Breadcrumbs.tsx";
import TwoColumnLayout from "../../components/layout/TwoColumnLayout";
import { getTextsByCollection } from "@/services/library";
import TextTags from "../commons/tags/TextTags.tsx";

const fetchWorks = async (bookId: string, limit = 10, skip = 0) => {
  const storedLanguage = localStorage.getItem(LANGUAGE);
  const language = storedLanguage ? mapLanguageCode(storedLanguage) : "en";

  return getTextsByCollection({
    collectionId: bookId,
    language,
    limit,
    skip,
  });
};

type TextItem = {
  id: string;
  title: string;
  language: string;
  license?: string | null;
  tag_ids?: string[];
};

type WorksResponse = {
  collection?: { id?: string; title?: string } | null;
  texts: TextItem[];
  has_more?: boolean;
  total?: number;
};

type WorksProps = {
  setRendererInfo?: (updater: any) => void;
  collection_id?: string;
  isCompactView?: boolean;
};

export const getWorksTotalPages = ({
  total,
  hasMore,
  currentPage,
  limit,
  textCount,
}: {
  total?: number;
  hasMore?: boolean;
  currentPage: number;
  limit: number;
  textCount: number;
}): number => {
  if (total != null) {
    return Math.ceil(total / limit);
  }
  const hasResults = textCount > 0 || Boolean(hasMore);
  if (!hasResults && currentPage <= 1) {
    return 0;
  }
  return currentPage + (hasMore ? 1 : 0);
};

const Works = (props?: WorksProps) => {
  const { collection_id, setRendererInfo, isCompactView = false } = props || {};
  const { id: paramId } = useParams();
  const { t } = useTranslate();
  const tolgee = useTolgee(["language"]);
  const language = tolgee.getLanguage() || "en";
  const id = collection_id || paramId || "";

  const [pagination, setPagination] = useState<{
    currentPage: number;
    limit: number;
  }>({ currentPage: 1, limit: 12 });
  const skip = useMemo(
    () => (pagination.currentPage - 1) * pagination.limit,
    [pagination],
  );

  useEffect(() => {
    setPagination((prev) =>
      prev.currentPage === 1 ? prev : { ...prev, currentPage: 1 },
    );
  }, [id, language]);

  const {
    data: worksData,
    isLoading: worksDataIsLoading,
    error: worksDataIsError,
  } = useQuery<WorksResponse>(
    ["works", id, language, skip, pagination.limit],
    () => fetchWorks(id, pagination.limit, skip),
    { refetchOnWindowFocus: false },
  );

  const texts: TextItem[] = worksData?.texts || [];

  const siteBaseUrl = window.location.origin;
  const canonicalUrl = `${siteBaseUrl}${window.location.pathname}`;
  const pageTitle = worksData?.collection?.title
    ? `${worksData.collection.title} | ${siteName}`
    : `Works | ${siteName}`;
  const earlyReturn = getEarlyReturn({
    isLoading: worksDataIsLoading,
    error: worksDataIsError,
    t,
  });
  if (earlyReturn) return earlyReturn;

  const totalPages = getWorksTotalPages({
    total: worksData?.total,
    hasMore: worksData?.has_more,
    currentPage: pagination.currentPage,
    limit: pagination.limit,
    textCount: texts.length,
  });
  const handlePageChange = (pageNumber: number) => {
    setPagination((prev: { currentPage: number; limit: number }) => ({
      ...prev,
      currentPage: pageNumber,
    }));
  };

  const rootTexts = texts;

  const breadcrumbItems = [
    { label: t("header.text"), path: "/collections" },
    { label: worksData?.collection?.title || "" },
  ];

  const handleTextClick = (text: TextItem) => {
    sessionStorage.setItem("textLanguage", text.language);
    if (setRendererInfo) {
      setRendererInfo((prev: any) => ({
        ...prev,
        requiredId: text.id,
        renderer: "texts",
      }));
    }
  };

  const getParentCollectionState = () => ({
    parentCollection: {
      id: id,
      title: worksData?.collection?.title,
    },
  });

  const renderRootTexts = () => {
    return (
      <div className="space-y-2">
        {rootTexts.length !== 0 && (
          <>
            <h1 className="text-xl font-semibold overalltext text-gray-700">
              {worksData?.collection?.title}
            </h1>
            <div
              className={`grid grid-cols-1 gap-6 pr-0 ${!isCompactView && "sm:grid-cols-2 lg:grid-cols-2"} md:gap-8`}
            >
              {rootTexts.map((text) => {
                if (setRendererInfo) {
                  return (
                    <button
                      type="button"
                      key={text.id}
                      onClick={() => handleTextClick(text)}
                      className={`${getLanguageClass(text.language)} flex flex-col gap-2 text-left text-gray-800 transition-colors hover:text-gray-600 cursor-pointer`}
                    >
                      <p className="text-lg pt-4 border-t">{text.title}</p>
                      <TextTags tagIds={text.tag_ids} />
                    </button>
                  );
                }

                return (
                  <Link
                    onClick={() => handleTextClick(text)}
                    key={text.id}
                    to={`/texts/${text.id}?type=root_text`}
                    state={getParentCollectionState()}
                    className={`${getLanguageClass(text.language)} flex flex-col gap-2 text-left text-gray-800 transition-colors hover:text-gray-600`}
                  >
                    <p className="text-lg pt-4 border-t">{text.title}</p>
                    <TextTags tagIds={text.tag_ids} />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  if (isCompactView) {
    return (
      <div className="space-y-4 p-4">
        {renderRootTexts()}
        <PaginationComponent
          pagination={pagination}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
          setPagination={setPagination}
        />
      </div>
    );
  }

  return (
    <TwoColumnLayout
      main={
        <div className="mx-auto flex w-full max-w-2xl flex-col pt-10">
          <div className="flex w-full flex-col space-y-4 text-left">
            <Seo
              title={pageTitle}
              description="Browse texts within this collection."
              canonical={canonicalUrl}
            />
            <Breadcrumbs items={breadcrumbItems} />
            {renderRootTexts()}
            <PaginationComponent
              pagination={pagination}
              totalPages={totalPages}
              handlePageChange={handlePageChange}
              setPagination={setPagination}
            />
          </div>
        </div>
      }
      sidebar={<div className="h-full w-full" />}
    />
  );
};

export default Works;
