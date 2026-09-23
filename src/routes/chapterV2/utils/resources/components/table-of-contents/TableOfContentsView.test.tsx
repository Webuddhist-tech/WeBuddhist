import { vi, describe, test, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TableOfContentsView from "./TableOfContentsView";
import { useTableOfContents } from "@/hooks/useTableOfContents.ts";

vi.mock("@/hooks/useTableOfContents.ts", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/useTableOfContents.ts")
  >("@/hooks/useTableOfContents.ts");
  return { ...actual, useTableOfContents: vi.fn() };
});

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, params?: Record<string, string> | string) => {
      if (typeof params === "object" && params?.title) {
        const verb = key === "common.collapse" ? "Collapse" : "Expand";
        return `${verb} ${params.title}`;
      }
      return typeof params === "string" ? params : key;
    },
  }),
}));

vi.mock("../../../../../../context/TransliterationContext.tsx", () => ({
  useTransliteration: () => ({
    displayContent: (value: string) => value,
    contentClass: (language: string) => `lang-${language}`,
  }),
}));

const mockedHook = useTableOfContents as ReturnType<typeof vi.fn>;

const section = (
  id: string,
  title: string,
  sections: unknown[] = [],
  segmentId?: string,
) => ({
  id,
  title,
  sections,
  segments: segmentId ? [{ segment_id: segmentId }] : [],
});

const toc = {
  contents: [
    {
      id: "toc-1",
      sections: [
        section(
          "chapter",
          "Chapter One",
          [
            section("part", "First Part", [], "s2"),
            section("part-2", "Second Part", [], "s5"),
          ],
          "s1",
        ),
      ],
    },
  ],
  text_detail: { id: "text-1", language: "bo", title: "A Text" },
};

const defaultProps = {
  textId: "text-1",
  handleSegmentNavigate: vi.fn(),
  handleNavigate: vi.fn(),
  onClose: vi.fn(),
};

const setup = (props: Partial<typeof defaultProps> = {}) =>
  render(<TableOfContentsView {...defaultProps} {...props} />);

describe("TableOfContentsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHook.mockReturnValue({
      data: toc,
      isLoading: false,
      error: null,
    });
  });

  test("shows every level expanded, without the reader opening anything", () => {
    setup();
    expect(screen.getByText("Chapter One")).toBeInTheDocument();
    expect(screen.getByText("First Part")).toBeInTheDocument();
    expect(screen.getByText("Second Part")).toBeInTheDocument();
  });

  test("a section can still be collapsed and reopened", () => {
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse Chapter One" }),
    );
    expect(screen.queryByText("First Part")).not.toBeInTheDocument();
    expect(screen.getByText("Chapter One")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand Chapter One" }));
    expect(screen.getByText("First Part")).toBeInTheDocument();
  });

  test("navigates to the segment a section begins at", () => {
    const handleSegmentNavigate = vi.fn();
    setup({ handleSegmentNavigate });

    fireEvent.click(screen.getByText("First Part"));

    expect(handleSegmentNavigate).toHaveBeenCalledWith("s2");
  });

  test("leaves a section the library could not anchor as plain text", () => {
    mockedHook.mockReturnValue({
      data: {
        contents: [
          { id: "toc-1", sections: [section("orphan", "Unanchored")] },
        ],
        text_detail: null,
      },
      isLoading: false,
      error: null,
    });
    setup();

    expect(screen.getByText("Unanchored")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unanchored" }),
    ).not.toBeInTheDocument();
  });

  test("goes back to the panel's main view", () => {
    const handleNavigate = vi.fn();
    setup({ handleNavigate });

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(handleNavigate).toHaveBeenCalledTimes(1);
  });
});
