import { useInfiniteQuery, useQuery } from "react-query";
import { findTextsByTitle } from "@/services/library";
import { fetchFeaturedEvents } from "../../live-events/api/eventsApi.ts";
import {
  eventPhase,
  eventTitle,
  sortByPhaseThenTime,
} from "../../live-events/utils/eventUtils.ts";
import { fetchSources } from "../sources/Sources.tsx";
import {
  searchGroups,
  searchMantras,
  searchPractice,
} from "../api/searchApi.ts";
import { foldForSearch } from "./Highlighted.tsx";

/** How many results a category loads at a time. */
export const SEARCH_PAGE_SIZE = 10;

const QUERY_OPTIONS = { refetchOnWindowFocus: false, retry: 1 };

/**
 * What every category reports to the page: its results so far, how many
 * there are in all (null when the source cannot say), and how to load more.
 */
export type CategoryResults<T> = {
  items: T[];
  total: number | null;
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
};

type Page<T> = { items: T[]; total: number | null; hasMore: boolean };

/**
 * One category's results as an infinite list. The key is shared by the
 * section's count, its first few results and its expanded list, so each
 * search is only made once.
 */
const useCategory = <T>(
  key: unknown[],
  query: string,
  fetchPage: (pageIndex: number) => Promise<Page<T>>,
): CategoryResults<T> => {
  const result = useInfiniteQuery(
    ["search", ...key, query],
    ({ pageParam = 0 }) => fetchPage(pageParam),
    {
      ...QUERY_OPTIONS,
      enabled: Boolean(query.trim()),
      getNextPageParam: (lastPage, pages) =>
        lastPage.hasMore ? pages.length : undefined,
    },
  );
  const pages = result.data?.pages ?? [];
  return {
    items: pages.flatMap((page) => page.items),
    total: pages[0]?.total ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    hasMore: Boolean(result.hasNextPage),
    loadMore: () => void result.fetchNextPage(),
    isLoadingMore: result.isFetchingNextPage,
  };
};

/** Texts whose title matches, from the OpenPecha library. */
export const useTextResults = (query: string) =>
  useCategory(["texts"], query, async (pageIndex) => {
    const page = await findTextsByTitle({
      query,
      limit: SEARCH_PAGE_SIZE,
      offset: pageIndex * SEARCH_PAGE_SIZE,
    });
    return { items: page.items, total: null, hasMore: page.hasMore };
  });

/**
 * Plan series, then single plans. They are searched separately and each
 * page holds the next slice of both, series first.
 */
export const usePlanResults = (query: string, language: string) =>
  useCategory(["plans", language], query, async (pageIndex) => {
    const page = {
      query,
      language,
      page: pageIndex + 1,
      pageSize: SEARCH_PAGE_SIZE,
    };
    const [series, plans] = await Promise.all([
      searchPractice({ ...page, kind: "series" }),
      searchPractice({ ...page, kind: "plans" }),
    ]);
    const seriesTotal = series.pagination?.total ?? series.items.length;
    const plansTotal = plans.pagination?.total ?? plans.items.length;
    const loaded = (pageIndex + 1) * SEARCH_PAGE_SIZE;
    return {
      items: [...series.items, ...plans.items],
      total: seriesTotal + plansTotal,
      hasMore: loaded < seriesTotal || loaded < plansTotal,
    };
  });

/** Preset mantras. */
export const useMantraResults = (query: string, language: string) =>
  useCategory(["mantras", language], query, async (pageIndex) => {
    const data = await searchMantras({
      query,
      language,
      limit: SEARCH_PAGE_SIZE,
      skip: pageIndex * SEARCH_PAGE_SIZE,
    });
    return {
      items: data.accumulators,
      total: data.total,
      hasMore: (pageIndex + 1) * SEARCH_PAGE_SIZE < data.total,
    };
  });

/** Practice spaces: communities and pages, joined or not. */
export const useGroupResults = (query: string, language: string) =>
  useCategory(["groups", language], query, async (pageIndex) => {
    const data = await searchGroups({
      query,
      language,
      limit: SEARCH_PAGE_SIZE,
      skip: pageIndex * SEARCH_PAGE_SIZE,
    });
    return {
      items: data.groups,
      total: data.total,
      hasMore: data.hasMore ?? false,
    };
  });

/**
 * Live and upcoming events whose title or host matches. There is no event
 * search endpoint, but the featured list is short, so it is filtered here -
 * from the same query the live page uses.
 */
export const useEventResults = (query: string, language: string) => {
  const result = useQuery(
    ["featured-events", language],
    () => fetchFeaturedEvents(language),
    { ...QUERY_OPTIONS, enabled: Boolean(query.trim()) },
  );
  const needle = foldForSearch(query.trim());
  const items = needle
    ? sortByPhaseThenTime(result.data ?? []).filter(
        (event) =>
          eventPhase(event) !== "past" &&
          foldForSearch(
            `${eventTitle(event, language)} ${event.group_name ?? ""}`,
          ).includes(needle),
      )
    : [];
  return {
    items,
    total: items.length,
    isLoading: result.isLoading,
    isError: result.isError,
    hasMore: false,
    loadMore: () => {},
    isLoadingMore: false,
  };
};

/**
 * How many verses match. Uses the same key as the verse list's first page,
 * so counting them costs nothing extra.
 */
export const useVerseCount = (query: string) => {
  const pagination = { currentPage: 1, limit: SEARCH_PAGE_SIZE };
  const result = useQuery(
    ["sources", query, 0, pagination],
    () => fetchSources(query, 0, pagination),
    { ...QUERY_OPTIONS, enabled: Boolean(query.trim()) },
  );
  return {
    total: result.data?.total ?? (result.isError ? 0 : null),
    isLoading: result.isLoading,
  };
};
