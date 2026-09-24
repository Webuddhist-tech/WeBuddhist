import { vi, describe, beforeEach, test, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChapterHeader from "./ChapterHeader.tsx";
import { PanelProvider } from "../../../../context/PanelContext.tsx";
import "@testing-library/jest-dom";
import { TolgeeProvider } from "@tolgee/react";
import { mockTolgee } from "../../../../test-utils/CommonMocks.js";
import { BrowserRouter as Router } from "react-router-dom";

vi.mock("../../../../utils/helperFunctions.tsx", () => ({
  getLanguageClass: (lang: string) => (lang ? `lang-${lang}` : ""),
}));

// Stands in for the real menu, exposing just the auto-scroll toggle the header
// wires up, so the tests can drive it without the whole option panel.
vi.mock("./view-selector/ViewSelector.tsx", () => ({
  __esModule: true,
  default: ({ onToggleAutoScroll }: any) => (
    <div data-testid="view-selector">
      ViewSelector
      <button type="button" onClick={onToggleAutoScroll}>
        toggle auto scroll
      </button>
    </div>
  ),
}));

vi.mock("./EditionAudioPlayer.tsx", () => ({
  __esModule: true,
  default: () => null,
}));

describe("ChapterHeader Component", () => {
  const defaultProps: any = {
    viewMode: "single",
    setViewMode: vi.fn(),
    layoutMode: "default",
    setLayoutMode: vi.fn(),
    textdetail: { title: "Test Chapter", language: "bo" },
    removeChapter: vi.fn(),
    currentChapter: { id: 1 },
    totalChapters: 2,
    versionSelected: null,
  };

  const renderHeader = (props: any = {}) =>
    render(
      <Router>
        <TolgeeProvider tolgee={mockTolgee} fallback={"Loading tolgee..."}>
          <PanelProvider>
            <ChapterHeader {...defaultProps} {...props} />
          </PanelProvider>
        </TolgeeProvider>
      </Router>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders the title with the language class", () => {
    renderHeader();
    const title = screen.getByText("Test Chapter");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("lang-bo");
  });

  test("offers no table-of-contents toggle - the outline lives in the resources panel", () => {
    renderHeader();
    expect(
      screen.queryByRole("button", { name: /table of contents/i }),
    ).not.toBeInTheDocument();
    // Back, view selector and close chapter.
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  test("calls removeChapter when close icon is clicked", () => {
    const removeChapter = vi.fn();
    const testChapter = { id: 5 };
    renderHeader({
      removeChapter,
      totalChapters: 3,
      currentChapter: testChapter,
    });
    const closeButton = screen.getByRole("button", { name: /close chapter/i });
    fireEvent.click(closeButton);
    expect(removeChapter).toHaveBeenCalledWith(testChapter);
  });

  test("opens view selector when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderHeader();
    expect(screen.queryByTestId("view-selector")).not.toBeInTheDocument();
    const viewSelectorIcon = screen.getByAltText("view selector");
    await user.click(viewSelectorIcon);
    expect(await screen.findByTestId("view-selector")).toBeInTheDocument();
  });

  test("renders without textdetail", () => {
    renderHeader({ textdetail: undefined });
    expect(screen.getByAltText("view selector")).toBeInTheDocument();
  });

  const openMenuAndToggleAutoScroll = async (props: any) => {
    const user = userEvent.setup();
    renderHeader(props);
    await user.click(screen.getByAltText("view selector"));
    await user.click(await screen.findByText("toggle auto scroll"));
    return user;
  };

  test("closes the menu on start, so the text it set moving is visible", async () => {
    const onToggleAutoScroll = vi.fn();
    await openMenuAndToggleAutoScroll({
      isAutoScrolling: false,
      onToggleAutoScroll,
    });
    expect(onToggleAutoScroll).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("view-selector")).not.toBeInTheDocument();
  });

  // Pausing from the menu is usually a prelude to changing the speed, so
  // closing would cost a reopen every time.
  test("leaves the menu open on pause", async () => {
    const onToggleAutoScroll = vi.fn();
    await openMenuAndToggleAutoScroll({
      isAutoScrolling: true,
      onToggleAutoScroll,
    });
    expect(onToggleAutoScroll).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("view-selector")).toBeInTheDocument();
  });
});
