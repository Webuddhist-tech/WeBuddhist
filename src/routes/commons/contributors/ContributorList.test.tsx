import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import type { ContributorDTO } from "@/services/library";
import ContributorList from "./ContributorList.js";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const contributors: ContributorDTO[] = [
  { type: "person", name: "Rinchen Zangpo", role: "translator" },
  { type: "person", name: "Sarvajnadeva", role: "author" },
];

describe("ContributorList", () => {
  test("names each contributor and the role they played", () => {
    render(<ContributorList contributors={contributors} />);

    expect(screen.getByText("Rinchen Zangpo")).toBeInTheDocument();
    expect(screen.getByText("Translator")).toBeInTheDocument();
    expect(screen.getByText("Sarvajnadeva")).toBeInTheDocument();
    expect(screen.getByText("Author")).toBeInTheDocument();
  });

  test("stacks the credits by default, for a narrow column", () => {
    const { container } = render(
      <ContributorList contributors={contributors} />,
    );

    expect(container.querySelector("ul")).toHaveClass("flex-col");
  });

  test("lays the credits out in a wrapping row when asked", () => {
    const { container } = render(
      <ContributorList contributors={contributors} layout="horizontal" />,
    );

    const list = container.querySelector("ul");
    expect(list).toHaveClass("flex-row");
    // A long credits list has to wrap rather than overflow the page.
    expect(list).toHaveClass("flex-wrap");
  });

  test("labels an AI contribution rather than leaving it blank", () => {
    render(
      <ContributorList
        contributors={[{ type: "ai", name: "", role: "translator" }]}
      />,
    );

    expect(screen.getByText("AI")).toBeInTheDocument();
  });
});
