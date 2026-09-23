import { vi, describe, test, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import * as reactQuery from "react-query";
import "@testing-library/jest-dom";
import "../../../../../../test-utils/CommonMocks.ts";
import ContributorsView from "./ContributorsView.js";

vi.mock("@/services/library", () => ({
  getTextContributors: vi.fn(),
}));

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
  useTolgee: () => ({ getLanguage: () => "en" }),
}));

const mockQuery = (result: Record<string, unknown>) => {
  vi.spyOn(reactQuery, "useQuery").mockImplementation(
    () => result as unknown as ReturnType<typeof reactQuery.useQuery>,
  );
};

const setup = () => {
  const handleNavigate = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ContributorsView
      textId="text-1"
      handleNavigate={handleNavigate}
      onClose={onClose}
    />,
  );
  return { ...view, handleNavigate, onClose };
};

describe("ContributorsView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("names each contributor and the role they played", () => {
    mockQuery({
      data: [
        { type: "person", name: "རྔོག་བློ་ལྡན་ཤེས་རབ།", role: "translator" },
        { type: "person", name: "Sarvajnadeva", role: "author" },
      ],
      isLoading: false,
    });
    setup();

    expect(screen.getByText("རྔོག་བློ་ལྡན་ཤེས་རབ།")).toBeInTheDocument();
    expect(screen.getByText("Translator")).toBeInTheDocument();
    expect(screen.getByText("Sarvajnadeva")).toBeInTheDocument();
    expect(screen.getByText("Author")).toBeInTheDocument();
  });

  test("counts the credits in its heading", () => {
    mockQuery({
      data: [
        { type: "person", name: "One", role: "author" },
        { type: "person", name: "Two", role: "reviser" },
      ],
      isLoading: false,
    });
    setup();

    expect(screen.getByText("Contributors (2)")).toBeInTheDocument();
  });

  test("keeps one row per credit when a name is credited twice", () => {
    mockQuery({
      data: [
        { type: "person", name: "One", role: "author" },
        { type: "person", name: "One", role: "reviser" },
      ],
      isLoading: false,
    });
    setup();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("One")).toHaveLength(2);
  });

  test("labels an AI contribution rather than leaving it blank", () => {
    mockQuery({
      data: [{ type: "ai", name: "", role: "translator" }],
      isLoading: false,
    });
    setup();

    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Translator")).toBeInTheDocument();
  });

  test("says so when the text is credited to nobody", () => {
    mockQuery({ data: [], isLoading: false });
    setup();

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(
      screen.getByText("No connections known for this source."),
    ).toBeInTheDocument();
  });

  test("goes back to the panel menu and closes the panel", () => {
    mockQuery({ data: [], isLoading: false });
    const { handleNavigate, onClose } = setup();

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(handleNavigate).toHaveBeenCalled();

    fireEvent.click(buttons[buttons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
