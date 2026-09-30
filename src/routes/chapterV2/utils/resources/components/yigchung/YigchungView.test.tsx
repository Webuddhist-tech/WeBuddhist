import { render, screen } from "@testing-library/react";
import { vi, describe, test, expect } from "vitest";
import YigchungView from "./YigchungView.tsx";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("@/context/TransliterationContext.tsx", () => ({
  useTransliteration: () => ({
    displayContent: (value: string) => value,
    contentClass: () => "bo-text",
  }),
}));

vi.mock("@/hooks/useYigchungs.ts", () => ({
  useYigchungs: () => ({
    data: {
      items: [
        {
          id: "y1",
          index: 0,
          label: "1",
          span: { start: 0, end: 3 },
          content: "note text",
        },
      ],
      text_detail: { id: "t1", language: "bo", title: "Test" },
    },
    isLoading: false,
    error: null,
  }),
}));

describe("YigchungView", () => {
  test("lists yigchung notes from the library hook", () => {
    render(
      <YigchungView
        textId="t1"
        handleSegmentNavigate={vi.fn()}
        handleNavigate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("text.yigchung")).toBeInTheDocument();
    expect(screen.getByText("note text")).toBeInTheDocument();
  });
});
