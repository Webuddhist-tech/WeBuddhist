import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import "../../test-utils/CommonMocks.ts";

import Team from "./Team";
import teamData from "./team.json";

const setup = () => render(<Team />);

describe("Team", () => {
  test("renders the page title and description", () => {
    setup();

    expect(
      screen.getByRole("heading", { level: 1, name: teamData.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(teamData.description)).toBeInTheDocument();
  });

  test("renders a section per working group with all its members", () => {
    setup();

    for (const group of teamData.groups) {
      const heading = screen.getByRole("heading", {
        level: 2,
        name: group.name,
      });
      const section = heading.closest("section") as HTMLElement;

      expect(section).toHaveAttribute("aria-labelledby", heading.id);
      expect(within(section).getAllByRole("listitem")).toHaveLength(
        group.members.length,
      );
    }
  });

  test("shows each member's name and role", () => {
    setup();

    const [member] = teamData.groups[0].members;
    const card = screen.getAllByText(member.name)[0].closest("li");

    expect(card).toHaveTextContent(member.role);
  });

  test("falls back to initials when a photo fails to load", () => {
    const { container } = setup();

    const [member] = teamData.groups[0].members;
    const photo = container.querySelector(`img[src="${member.image}"]`);
    fireEvent.error(photo as Element);

    const card = screen.getAllByText(member.name)[0].closest("li");
    expect(within(card as HTMLElement).queryByRole("img")).toBeNull();
    expect(card).toHaveTextContent(
      member.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join(""),
    );
  });
});
