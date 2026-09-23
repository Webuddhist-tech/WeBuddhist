import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import {
  buildChapterUrl,
  getLanguageClass,
  mapLanguageCode,
} from "../../utils/helperFunctions.tsx";
import Seo from "../commons/seo/Seo.tsx";
import { LANGUAGE, siteName } from "../../utils/constants.ts";
import { useTranslate } from "@tolgee/react";
import { useParams, useLocation, Link } from "react-router-dom";
import Versions from "./versions/Versions.tsx";
import Commentaries from "./commentaries/Commentaries.tsx";
import Breadcrumbs, {
  type BreadcrumbItemType,
} from "../commons/breadcrumbs/Breadcrumbs.tsx";
import TextTags from "../commons/tags/TextTags.tsx";
import ContributorList from "../commons/contributors/ContributorList.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TwoColumnLayout from "../../components/layout/TwoColumnLayout";
import { usePanelContext } from "@/context/PanelContext.tsx";
import {
  getTableOfContents,
  getTextCommentariesByEdition,
  getTextsByCollection,
  getTextVersionsByEdition,
} from "@/services/library";

export const fetchVersions = async (
  textId: string,
  skip: number,
  limit: number,
) => getTextVersionsByEdition({ editionId: textId, skip, limit });

export const fetchCommentaries = async (
  textId: string,
  skip: number,
  limit: number,
) => ({
  items: await getTextCommentariesByEdition({ editionId: textId, skip, limit }),
});

const Texts = (props: any) => {
  const {
    collection_id,
    addChapter,
    currentChapter,
    isCompactView = false,
  } = props || {};
  const { t } = useTranslate();
  const { closeResourcesPanel } = usePanelContext() as any;
  const { id: urlId } = useParams();
  const location = useLocation();
  const textId = collection_id || urlId || "";
  const [pagination, setPagination] = useState({ currentPage: 1, limit: 10 });
  const [versionsPagination] = useState({ currentPage: 1, limit: 10 });
  // Controlled, so the page knows which tab is open: the credits below belong
  // to this text, and under the commentaries - each of which lists its own -
  // they would read as that commentary's.
  const [activeTab, setActiveTab] = useState("versions");
  const [commentariesPagination, setCommentariesPagination] = useState({
    currentPage: 1,
    limit: 10,
  });
  const skip = useMemo(
    () => (pagination?.currentPage - 1) * pagination?.limit,
    [pagination],
  );
  const versionsSkip = useMemo(
    () => (versionsPagination?.currentPage - 1) * versionsPagination?.limit,
    [versionsPagination],
  );
  const commentariesSkip = useMemo(
    () =>
      (commentariesPagination?.currentPage - 1) * commentariesPagination?.limit,
    [commentariesPagination],
  );

  const { data: tableOfContents } = useQuery(
    ["table-of-contents", textId, skip, pagination.limit],
    () => getTableOfContents(textId),
    { refetchOnWindowFocus: false, enabled: !!textId, retry: false },
  );

  const {
    data: versions,
    isLoading: versionsIsLoading,
    error: versionsIsError,
  } = useQuery(
    ["versions", textId, versionsSkip, versionsPagination.limit],
    () => fetchVersions(textId, versionsSkip, versionsPagination.limit),
    { refetchOnWindowFocus: false, enabled: !!textId },
  );

  const {
    data: commentaries,
    isLoading: commentariesIsLoading,
    error: commentariesIsError,
  } = useQuery(
    ["commentaries", textId, commentariesSkip, commentariesPagination.limit],
    () =>
      fetchCommentaries(textId, commentariesSkip, commentariesPagination.limit),
    { refetchOnWindowFocus: false, enabled: !!textId, retry: false },
  );

  const parentCollectionId = location.state?.parentCollection?.id || null;

  const { data: parentCollectionData } = useQuery(
    ["works", parentCollectionId, 0, 12],
    async () => {
      const storedLanguage = localStorage.getItem(LANGUAGE);
      const language = storedLanguage ? mapLanguageCode(storedLanguage) : "en";
      return getTextsByCollection({
        collectionId: parentCollectionId,
        language,
        limit: 12,
        skip: 0,
      });
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!parentCollectionId,
      staleTime: 1000 * 60 * 5,
    },
  );

  const siteBaseUrl = window.location.origin;
  const canonicalUrl = `${siteBaseUrl}${window.location.pathname}`;
  const dynamicTitle = versions?.text?.title
    ? `${versions.text.title} | ${siteName}`
    : `Text | ${siteName}`;
  const description =
    "Read Buddhist texts with translations and related resources.";

  const breadcrumbItems: BreadcrumbItemType[] = useMemo(() => {
    const items: BreadcrumbItemType[] = [
      { label: t("header.text"), path: "/" },
    ];

    const collectionTitle = parentCollectionData?.collection?.title;
    if (parentCollectionId && collectionTitle) {
      items.push({
        label: collectionTitle,
        path: `/works/${parentCollectionId}`,
      });
    }

    if (versions?.text?.title) {
      items.push({ label: versions.text.title });
    }
    return items;
  }, [
    parentCollectionId,
    parentCollectionData?.collection?.title,
    versions?.text?.title,
    t,
  ]);

  const renderTabs = () => {
    return (
      <Tabs
        className="w-full space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="overalltext">
          <TabsTrigger value="versions">{t("common.version")}</TabsTrigger>
          {(commentaries?.items?.length ?? 0) > 0 && (
            <TabsTrigger value="commentaries">
              {t("text.type.commentary")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="versions">
          <Versions
            contentId={tableOfContents?.contents?.[0]?.id}
            versions={versions}
            versionsIsLoading={versionsIsLoading}
            versionsIsError={versionsIsError}
            addChapter={addChapter}
            currentChapter={currentChapter}
          />
        </TabsContent>
        <TabsContent value="commentaries" className="mt-2">
          <Commentaries
            textId={textId}
            items={commentaries?.items || []}
            isLoading={commentariesIsLoading}
            isError={commentariesIsError}
            pagination={commentariesPagination}
            setPagination={setCommentariesPagination}
            addChapter={addChapter}
            currentChapter={currentChapter}
          />
        </TabsContent>
      </Tabs>
    );
  };

  const contributors = versions?.text?.contributors ?? [];

  const renderContributors = () =>
    contributors.length > 0 && (
      <section className="flex w-full flex-col text-left">
        <h2 className="overalltext border-b py-2 font-bold text-faded-grey">
          {t("panel.contributors", "Contributors")}
        </h2>
        <ContributorList
          contributors={contributors}
          layout="horizontal"
          className="mt-4"
        />
      </section>
    );

  const handleTextTitleClick = (e: React.MouseEvent) => {
    if (addChapter) {
      e.preventDefault();
      addChapter({ textId: textId }, currentChapter);
      closeResourcesPanel?.();
    }
  };

  if (isCompactView) {
    return (
      <div className="space-y-4 p-4">
        {addChapter ? (
          <button
            type="button"
            onClick={handleTextTitleClick}
            className="text-left cursor-pointer hover:opacity-80 transition-opacity"
          >
            <h1
              className={`text-gray-800 text-lg ${getLanguageClass(versions?.text?.language)}`}
            >
              {versions?.text?.title}
            </h1>
          </button>
        ) : (
          <Link
            to={buildChapterUrl({
              text_id: textId,
              content_id: tableOfContents?.contents[0]?.id,
            })}
            className="text-left"
          >
            <h1
              className={`text-gray-800 ${getLanguageClass(versions?.text?.language)}`}
            >
              {versions?.text?.title}
            </h1>
          </Link>
        )}
        <TextTags tagIds={versions?.text?.tag_ids} />
        {renderTabs()}
      </div>
    );
  }

  return (
    <TwoColumnLayout
      main={
        <div className="mx-auto flex w-full max-w-2xl flex-col pt-10">
          <div className="flex w-full flex-col space-y-6 text-left">
            <Seo
              title={dynamicTitle}
              description={description}
              canonical={canonicalUrl}
            />
            <Breadcrumbs items={breadcrumbItems} />
            <Link
              to={buildChapterUrl({
                text_id: textId,
                content_id: tableOfContents?.contents[0]?.id,
              })}
              className="text-left"
            >
              <p
                className={`text-gray-800 text-lg ${getLanguageClass(versions?.text?.language)}`}
              >
                {versions?.text?.title}
              </p>
            </Link>
            <TextTags tagIds={versions?.text?.tag_ids} className="-mt-4" />
            {renderTabs()}
            {activeTab === "versions" && renderContributors()}
          </div>
        </div>
      }
      sidebar={<div className="h-full w-full" />}
    />
  );
};

export default Texts;
