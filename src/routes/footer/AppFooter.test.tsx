import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AppFooter, { FOOTER_LINKS } from "./AppFooter";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback,
  }),
}));

const renderFooter = () =>
  render(
    <MemoryRouter>
      <AppFooter />
    </MemoryRouter>,
  );

describe("AppFooter", () => {
  it("links out to every external page in a new tab", () => {
    renderFooter();
    for (const { href, label } of FOOTER_LINKS) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("links to the team, privacy policy and terms of service in the app", () => {
    renderFooter();
    const team = screen.getByRole("link", { name: "Team" });
    expect(team).toHaveAttribute("href", "/team");
    expect(team).not.toHaveAttribute("target");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy-policy");
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms-of-service");
  });
});
