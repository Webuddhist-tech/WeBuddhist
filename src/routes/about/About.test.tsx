import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import "../../test-utils/CommonMocks.ts";

import About from "./About";

const setup = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  );

describe("About", () => {
  test("renders the page title and front-matter tagline", () => {
    setup();

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to WeBuddhist!" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We are Buddhist. We learn, practice and connect. Daily.",
      ),
    ).toBeInTheDocument();
  });

  test("renders mission and vision cards", () => {
    setup();

    expect(screen.getByText("Mission")).toBeInTheDocument();
    expect(screen.getByText("Vision")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We help Buddhists do less harm, more good, and know their own mind better by learning, practicing and connecting, daily.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A world where all beings are free from suffering and find lasting happiness.",
      ),
    ).toBeInTheDocument();
  });

  test("renders all content section headings", () => {
    setup();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Why — Our Purpose",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "How — The Buddha's Method",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "What — Content and Technology",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "The Team" }),
    ).toBeInTheDocument();
  });

  test("renders the three truths as numbered cards", () => {
    setup();

    expect(
      screen.getByText(
        "As Buddhists, we accept that everything is impermanent.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "As Buddhists, we accept that nothing will ever fully satisfy us.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "As Buddhists, we accept that nothing — not even ourselves — exists as it appears to us.",
      ),
    ).toBeInTheDocument();
  });

  test("renders the four pillars", () => {
    setup();

    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("Connect")).toBeInTheDocument();
    expect(screen.getByText("Sustain")).toBeInTheDocument();
    expect(
      screen.getByText(
        "we help Buddhists access the Dhamma in their own words;",
      ),
    ).toBeInTheDocument();
  });

  test("renders team roles with emphasized labels", () => {
    setup();

    expect(screen.getByText("Product Engineering")).toHaveClass("font-medium");
    expect(
      screen.getByText("Content Engineering and Data Services"),
    ).toHaveClass("font-medium");
    expect(screen.getByText("Community & Campaigns")).toHaveClass(
      "font-medium",
    );
    expect(screen.getByText("Partnerships & Funding")).toHaveClass(
      "font-medium",
    );
  });

  test("links sections to their headings for accessibility", () => {
    setup();

    const purposeSection = screen
      .getByRole("heading", { name: "Why — Our Purpose" })
      .closest("section");
    expect(purposeSection).toHaveAttribute(
      "aria-labelledby",
      "why-our-purpose",
    );

    const teamSection = screen
      .getByRole("heading", { name: "The Team" })
      .closest("section");
    expect(teamSection).toHaveAttribute("aria-labelledby", "the-team");
  });

  test("renders merged paragraph content from the markdown source", () => {
    setup();

    expect(
      screen.getByText(/WeBuddhist exists so that we — and anyone who wishes/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/five-minute daily dharma routine/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Six teams carry on our mission/),
    ).toBeInTheDocument();
  });

  test("renders the platform sections from the products markdown", () => {
    setup();

    for (const name of [
      "Our Platforms",
      "WeBuddhist Practice Platform",
      "WeBuddhist Academy",
      "Buddhist Creators Platform",
      "WeBuddhist Tech",
      "Free Access and Long-Term Sustainability",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name }),
      ).toBeInTheDocument();
    }

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Five sections in the app",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Specialist agent memory:")).toHaveClass(
      "font-medium",
    );
  });

  test("places the platforms between the What section and the team", () => {
    setup();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    const whatIndex = headings.indexOf("What — Content and Technology");

    expect(headings[whatIndex + 1]).toBe("Our Platforms");
    expect(headings.indexOf("The Team")).toBeGreaterThan(
      headings.indexOf("WeBuddhist Tech"),
    );
  });

  test("renders an on-this-page nav linking to every section heading", () => {
    setup();

    const toc = screen.getByRole("navigation", { name: "On this page" });
    const links = within(toc).getAllByRole("link");
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 });

    expect(links.map((link) => link.textContent)).toEqual(
      sectionHeadings.map((heading) => heading.textContent),
    );
    links.forEach((link, index) => {
      expect(link).toHaveAttribute("href", `#${sectionHeadings[index].id}`);
    });
  });

  test("links the team section to the team page", () => {
    setup();

    const teamSection = screen
      .getByRole("heading", { name: "The Team" })
      .closest("section") as HTMLElement;
    expect(
      within(teamSection).getByRole("link", { name: /Meet the team/ }),
    ).toHaveAttribute("href", "/team");
  });

  test("renders the sponsors section with logos", () => {
    setup();

    expect(
      screen.getByRole("heading", { level: 2, name: "Sponsors" }),
    ).toBeInTheDocument();

    expect(screen.getByAltText("OpenPecha")).toBeInTheDocument();
    expect(screen.getByAltText("Dharmaduta")).toBeInTheDocument();

    const sponsorsSection = screen
      .getByRole("heading", { name: "Sponsors" })
      .closest("section");
    expect(sponsorsSection).toHaveAttribute("aria-labelledby", "sponsors");
  });
});
