import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as reactQuery from "react-query";
import "@testing-library/jest-dom";
import {
  mockAxios,
  mockReactQuery,
  mockTolgee,
  mockUseAuth,
  mockLocalStorage,
} from "../../test-utils/CommonMocks.js";
import { vi, beforeEach, afterEach, test, expect, describe } from "vitest";
import { QueryClient, QueryClientProvider } from "react-query";
import axiosInstance from "../../config/axios-config.js";
import Works, { getWorksTotalPages } from "./Works.js";
import { BrowserRouter as Router, useParams } from "react-router-dom";
import { TolgeeProvider } from "@tolgee/react";

import { getTextsByCollection } from "@/services/library";
mockAxios();
mockUseAuth();
mockReactQuery();

vi.mock("@/services/library", () => ({
  getTextsByCollection: vi.fn(),
}));

// Tag labels have their own tests; here they would only add a second useQuery
// call for the mock above to answer.
vi.mock("../commons/tags/TextTags.tsx", () => ({
  default: () => null,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
    Link: ({ to, className, children }) => (
      <a href={to} className={className} data-testid="router-link">
        {children}
      </a>
    ),
  };
});

describe("Works Component", () => {
  const queryClient = new QueryClient();
  const mockTextCategoryData = {
    term: {
      title: "Text Category",
      description: "Text Category Description",
    },
    texts: [
      {
        id: "text1",
        title: "Root Text 1",
        type: "root_text",
        language: "bo",
      },
      {
        id: "text2",
        title: "Root Text 2",
        type: "root_text",
        language: "en",
      },
      {
        id: "text3",
        title: "Commentary 1",
        type: "commentary",
        language: "bo",
      },
    ],
  };

  let localStorageMock;

  beforeEach(() => {
    vi.restoreAllMocks();
    useParams.mockReturnValue({ id: "works-id" });
    localStorageMock = mockLocalStorage();
    localStorageMock.getItem.mockReturnValue("en");
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: mockTextCategoryData,
      isLoading: false,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const setup = (props = {}) => {
    return render(
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Works {...props} />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>,
    );
  };

  test("renders texts correctly", () => {
    setup();
    expect(screen.getByText("Root Text 1")).toBeInTheDocument();
    expect(screen.getByText("Root Text 2")).toBeInTheDocument();
    expect(screen.getByText("Commentary 1")).toBeInTheDocument();
  });

  test("displays loading state when data is being fetched", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: null,
      isLoading: true,
    }));

    setup();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("displays error message when there is an error", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: null,
      isLoading: false,
      error: new Error("Failed to fetch text category"),
    }));

    setup();
    expect(screen.getByText("global.not_found")).toBeInTheDocument();
  });

  test("renders correct links to text detail chapter", () => {
    const updatedMockData = {
      term: {
        title: "Text Category",
        description: "Text Category Description",
      },
      collection: {
        title: "Text Category",
      },
      texts: [
        {
          id: "text1",
          title: "Root Text 1",
          type: "root_text",
          language: "en",
        },
        {
          id: "text2",
          title: "Root Text 2",
          type: "root_text",
          language: "en",
        },
        {
          id: "text3",
          title: "Commentary 1",
          type: "commentary",
          language: "en",
        },
      ],
    };

    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: updatedMockData,
      isLoading: false,
    }));

    setup();
    const links = screen.getAllByTestId("router-link");
    // 1 breadcrumb link + 3 text links = 4 total
    expect(links).toHaveLength(4);
    expect(links[1].getAttribute("href")).toBe("/texts/text1?type=root_text");
    expect(links[2].getAttribute("href")).toBe("/texts/text2?type=root_text");
  });

  test("uses default category ID when none provided", () => {
    useParams.mockReturnValue({});

    const querySpy = vi.fn();
    vi.spyOn(reactQuery, "useQuery").mockImplementation(
      (_queryKey, queryFn) => {
        querySpy(queryFn.toString());
        return {
          data: mockTextCategoryData,
          isLoading: false,
        };
      },
    );

    setup();

    expect(querySpy).toHaveBeenCalled();
  });

  test("uses correct language from localStorage", () => {
    localStorageMock.getItem.mockReturnValue("bo");

    const axiosSpy = vi.spyOn(axiosInstance, "get");
    axiosSpy.mockResolvedValueOnce({ data: mockTextCategoryData });

    setup();

    expect(reactQuery.useQuery).toHaveBeenCalled();
    const queryKey = reactQuery.useQuery.mock.calls[0][0];
    expect(queryKey).toEqual(["works", "works-id", "en", 0, 12]);
  });

  test("uses pagination parameters correctly", () => {
    const querySpy = vi.spyOn(reactQuery, "useQuery");

    setup();

    expect(querySpy).toHaveBeenCalled();
    const options = querySpy.mock.calls[0][2];
    expect(options.refetchOnWindowFocus).toBe(false);
  });

  test("handles API call errors by showing error message", () => {
    const errorMessage = "Network Error";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockError = {
      response: { status: 500, data: { message: errorMessage } },
    };

    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => {
      console.error("API call error:", mockError.response || mockError);

      return {
        data: null,
        isLoading: false,
        error: new Error(errorMessage),
      };
    });

    setup();

    expect(screen.getByText("global.not_found")).toBeInTheDocument();

    expect(consoleSpy).toHaveBeenCalledWith(
      "API call error:",
      mockError.response,
    );

    consoleSpy.mockRestore();
  });

  test("uses correct language from localStorage with mapping", () => {
    localStorageMock.getItem.mockReturnValue("en");
    const worksSpy = (
      getTextsByCollection as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(mockTextCategoryData);

    vi.spyOn(reactQuery, "useQuery").mockImplementation((_, queryFn) => {
      queryFn();
      return {
        data: mockTextCategoryData,
        isLoading: false,
      };
    });

    setup();

    expect(worksSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionId: "works-id",
        language: "en",
        limit: 12,
        skip: 0,
      }),
    );

    vi.clearAllMocks();
  });

  test("defaults to 'en' language when localStorage is empty", () => {
    localStorageMock.getItem.mockReturnValue(null);
    const worksSpy = (
      getTextsByCollection as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(mockTextCategoryData);

    vi.spyOn(reactQuery, "useQuery").mockImplementation((_, queryFn) => {
      queryFn();
      return {
        data: mockTextCategoryData,
        isLoading: false,
      };
    });

    setup();

    expect(worksSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      }),
    );
  });

  test("passes correct pagination parameters to API", () => {
    const worksSpy = (
      getTextsByCollection as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(mockTextCategoryData);

    vi.spyOn(reactQuery, "useQuery").mockImplementation((_, queryFn) => {
      queryFn();
      return {
        data: mockTextCategoryData,
        isLoading: false,
      };
    });

    setup();

    expect(worksSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 12,
        skip: 0,
      }),
    );
  });

  test("renders all texts regardless of type", () => {
    const multipleTypesData = {
      term: {
        title: "Multiple Types",
        description: "Contains various text types",
      },
      texts: [
        {
          id: "text1",
          title: "Root Text 1",
          type: "root_text",
          language: "en",
        },
        {
          id: "text2",
          title: "Root Text 2",
          type: "root_text",
          language: "en",
        },
        {
          id: "text3",
          title: "Commentary 1",
          type: "commentary",
          language: "en",
        },
      ],
    };

    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: multipleTypesData,
      isLoading: false,
    }));

    setup();

    expect(screen.getByText("Root Text 1")).toBeInTheDocument();
    expect(screen.getByText("Root Text 2")).toBeInTheDocument();
    expect(screen.getByText("Commentary 1")).toBeInTheDocument();
  });

  test("renders correctly when category has no description", () => {
    const noDescriptionData = {
      collection: {
        title: "No Description Category",
      },
      texts: [
        {
          id: "text1",
          title: "Root Text 1",
          type: "root_text",
          language: "en",
        },
      ],
    };

    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: noDescriptionData,
      isLoading: false,
    }));

    setup();

    expect(screen.getAllByText("No Description Category")).toHaveLength(2);
    expect(screen.getByText("Root Text 1")).toBeInTheDocument();
  });

  test("renders button and calls setRendererInfo when prop is provided", async () => {
    const user = userEvent.setup();
    const mockSetRendererInfo = vi.fn();
    const dataWithTexts = {
      collection: { title: "Click Collection" },
      texts: [
        {
          id: "text-click-1",
          title: "Clickable Text",
          type: "root_text",
          language: "bo",
        },
      ],
      total: 1,
    };

    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: dataWithTexts,
      isLoading: false,
    }));

    setup({ setRendererInfo: mockSetRendererInfo });

    const button = screen.getByRole("button", { name: /Clickable Text/i });
    await user.click(button);

    expect(mockSetRendererInfo).toHaveBeenCalled();
  });

  test("shows next page when has_more is true", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: { ...mockTextCategoryData, has_more: true },
      isLoading: false,
    }));

    setup();

    expect(screen.getByLabelText("pagination")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to next page")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  test("shows pagination on the last page when texts are present", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: { ...mockTextCategoryData, has_more: false },
      isLoading: false,
    }));

    setup();

    expect(screen.getByLabelText("pagination")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Go to next page")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("hides pagination when there are no texts and has_more is false", () => {
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: { texts: [], has_more: false },
      isLoading: false,
    }));

    setup();

    expect(screen.queryByLabelText("pagination")).not.toBeInTheDocument();
  });

  test("getWorksTotalPages uses total when present and has_more otherwise", () => {
    expect(
      getWorksTotalPages({
        total: 25,
        hasMore: true,
        currentPage: 1,
        limit: 12,
        textCount: 12,
      }),
    ).toBe(3);

    expect(
      getWorksTotalPages({
        hasMore: true,
        currentPage: 1,
        limit: 12,
        textCount: 12,
      }),
    ).toBe(2);

    expect(
      getWorksTotalPages({
        hasMore: false,
        currentPage: 1,
        limit: 12,
        textCount: 3,
      }),
    ).toBe(1);

    expect(
      getWorksTotalPages({
        hasMore: false,
        currentPage: 1,
        limit: 12,
        textCount: 0,
      }),
    ).toBe(0);
  });

  test("resets to first page when collection id changes", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    vi.spyOn(reactQuery, "useQuery").mockImplementation(() => ({
      data: { ...mockTextCategoryData, has_more: true },
      isLoading: false,
    }));

    const renderWorks = () => (
      <Router>
        <QueryClientProvider client={queryClient}>
          <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
            <Works />
          </TolgeeProvider>
        </QueryClientProvider>
      </Router>
    );

    const { rerender } = render(renderWorks());

    await user.click(screen.getByRole("link", { name: "2" }));
    expect(
      reactQuery.useQuery.mock.calls.some(
        ([queryKey]) =>
          Array.isArray(queryKey) &&
          queryKey[1] === "works-id" &&
          queryKey[3] === 12,
      ),
    ).toBe(true);

    useParams.mockReturnValue({ id: "other-id" });
    rerender(renderWorks());

    await waitFor(() => {
      const lastKey = reactQuery.useQuery.mock.calls.at(-1)[0];
      expect(lastKey).toEqual(["works", "other-id", "en", 0, 12]);
    });
  });
});
