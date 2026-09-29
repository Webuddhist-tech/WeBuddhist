import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";

import EventDescriptionMarkdown from "./EventDescriptionMarkdown.tsx";

describe("EventDescriptionMarkdown", () => {
  it("renders headings, emphasis, blockquote, and ordered lists", () => {
    render(
      <EventDescriptionMarkdown
        content={`## Section title

### Subheading

*Emphasized* text

> A quoted line

1. First step
2. Second step`}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Section title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Subheading" }),
    ).toBeInTheDocument();

    const emphasis = screen.getByText("Emphasized");
    expect(emphasis.tagName).toBe("EM");

    expect(screen.getByText("A quoted line")).toBeInTheDocument();
    expect(
      screen.getByText("A quoted line").closest("blockquote"),
    ).toBeInTheDocument();

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(screen.getByText("First step")).toBeInTheDocument();
    expect(screen.getByText("Second step")).toBeInTheDocument();
  });

  it("opens safe external links in a new tab", () => {
    render(
      <EventDescriptionMarkdown content="Visit [our site](https://example.com/puja)." />,
    );

    const link = screen.getByRole("link", { name: "our site" });
    expect(link).toHaveAttribute("href", "https://example.com/puja");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders link text without an anchor when the URL is not safe", () => {
    render(
      <EventDescriptionMarkdown content="Do not [click](/internal/path) or [run](javascript:alert(1))." />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("click")).toBeInTheDocument();
    expect(screen.getByText("run")).toBeInTheDocument();
  });

  it("preserves single newlines as soft line breaks", () => {
    const { container } = render(
      <EventDescriptionMarkdown
        content={"Doors open 9:00\nPlease arrive early."}
      />,
    );

    expect(screen.getByText(/Doors open 9:00/)).toBeInTheDocument();
    expect(screen.getByText(/Please arrive early/)).toBeInTheDocument();
    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("renders a markdown h1 as a styled h3 under the page heading", () => {
    render(<EventDescriptionMarkdown content="# Schedule details" />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    const subheading = screen.getByRole("heading", {
      level: 3,
      name: "Schedule details",
    });
    expect(subheading).toHaveClass("font-semibold", "text-[#102544]");
  });

  it("merges an optional className onto the wrapper", () => {
    const { container } = render(
      <EventDescriptionMarkdown content="Plain text." className="mt-2" />,
    );

    expect(container.firstElementChild).toHaveClass("min-w-0", "mt-2");
  });
});
