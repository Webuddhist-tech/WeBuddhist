import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TextExpand from "./TextExpand";
import { TransliterationProvider } from "@/context/TransliterationContext";
import {
  TRANSLITERATION_MODE,
  TRANSLITERATION_SCRIPT,
} from "@/utils/constants";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (key: string) => key,
  }),
}));

const setup = (props: {
  children: string;
  maxLength: number;
  language: string;
}) => {
  return render(<TextExpand {...props} />);
};

describe("TextExpand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when children is empty string", () => {
    const { container } = setup({
      children: "",
      maxLength: 50,
      language: "en",
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders full text when shorter than maxLength", () => {
    setup({ children: "Short text", maxLength: 50, language: "en" });
    expect(screen.getByText("Short text")).toBeInTheDocument();
    expect(screen.queryByText("panel.showmore")).not.toBeInTheDocument();
  });

  it("expands and collapses text on button click", () => {
    const longText = "This is a very long text that exceeds the max length";
    setup({ children: longText, maxLength: 20, language: "en" });

    const button = screen.getByText("panel.showmore");
    fireEvent.click(button);
    expect(screen.getByText("panel.showless")).toBeInTheDocument();

    fireEvent.click(screen.getByText("panel.showless"));
    expect(screen.getByText("panel.showmore")).toBeInTheDocument();
  });

  describe("line break transformation", () => {
    it("transforms ⤵ character to <br> tag in content", () => {
      const { container } = setup({
        children: "Line one⤵Line two",
        maxLength: 100,
        language: "en",
      });
      const contentDiv = container.querySelector("div");
      expect(contentDiv?.innerHTML).toContain("<br>");
      expect(contentDiv?.innerHTML).not.toContain("⤵");
    });

    it("transforms multiple ⤵ characters to <br> tags", () => {
      const { container } = setup({
        children: "Line one⤵Line two⤵Line three",
        maxLength: 100,
        language: "en",
      });
      const contentDiv = container.querySelector("div");
      const brCount = (contentDiv?.innerHTML.match(/<br>/g) || []).length;
      expect(brCount).toBe(2);
      expect(contentDiv?.innerHTML).not.toContain("⤵");
    });

    it("handles content without ⤵ character correctly", () => {
      const { container } = setup({
        children: "Normal text without special characters",
        maxLength: 100,
        language: "en",
      });
      const contentDiv = container.querySelector("div");
      expect(contentDiv?.innerHTML).toBe(
        "Normal text without special characters",
      );
    });

    it("transforms ⤵ in truncated content when collapsed", () => {
      const { container } = setup({
        children: "Start⤵Middle text that is very long and will be truncated",
        maxLength: 20,
        language: "en",
      });
      const contentDiv = container.querySelector("div");
      expect(contentDiv?.innerHTML).toContain("<br>");
      expect(contentDiv?.innerHTML).not.toContain("⤵");
    });

    it("transforms ⤵ in full content when expanded", () => {
      const longTextWithArrow =
        "Start⤵Middle⤵End of a very long text that exceeds max length";
      setup({
        children: longTextWithArrow,
        maxLength: 20,
        language: "en",
      });

      const button = screen.getByText("panel.showmore");
      fireEvent.click(button);

      const contentDiv = document.querySelector("div.text-base");
      expect(contentDiv?.innerHTML).toContain("<br>");
      expect(contentDiv?.innerHTML).not.toContain("⤵");
      const brCount = (contentDiv?.innerHTML.match(/<br>/g) || []).length;
      expect(brCount).toBe(2);
    });

    it("handles empty string with transformation", () => {
      const { container } = setup({
        children: "",
        maxLength: 50,
        language: "en",
      });
      expect(container.firstChild).toBeNull();
    });

    it("handles content with only ⤵ character", () => {
      const { container } = setup({
        children: "⤵",
        maxLength: 50,
        language: "en",
      });
      const contentDiv = container.querySelector("div");
      expect(contentDiv?.innerHTML).toBe("<br>");
    });
  });

  it("returns null for non-string children", () => {
    const { container } = render(
      <TextExpand children={123 as any} maxLength={50} language="en" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses default maxLength when maxLength is not provided", () => {
    const longText = "A".repeat(300); // Longer than DEFAULT_MAX_LENGTH (250)
    setup({
      children: longText,
      maxLength: 0, // Should use DEFAULT_MAX_LENGTH
      language: "en",
    });
    expect(screen.getByText("panel.showmore")).toBeInTheDocument();
  });

  it("applies correct language class", () => {
    const { container } = setup({
      children: "Test content",
      maxLength: 50,
      language: "bo",
    });
    const contentDiv = container.querySelector("div");
    expect(contentDiv).toHaveClass("bo-text");
  });

  it("handles transformation with null content gracefully", () => {
    // Test the transformLineBreaks function edge case
    const { container } = setup({
      children: "",
      maxLength: 50,
      language: "en",
    });
    expect(container.firstChild).toBeNull();
  });

  it("shows exact maxLength characters when truncated", () => {
    const text = "12345678901234567890"; // 20 characters
    const { container } = setup({
      children: text,
      maxLength: 10,
      language: "en",
    });
    const contentDiv = container.querySelector("div");
    expect(contentDiv?.innerHTML).toBe("1234567890");
    expect(screen.getByText("panel.showmore")).toBeInTheDocument();
  });
});

describe("TextExpand transliteration", () => {
  const setupInScript = (
    script: string,
    props: {
      children: string;
      maxLength: number;
      language: string;
      transliterable?: boolean;
    },
    mode = "below",
  ) => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, script);
    localStorage.setItem(TRANSLITERATION_MODE, mode);
    return render(
      <TransliterationProvider>
        <TextExpand {...props} />
      </TransliterationProvider>,
    );
  };

  const lines = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("div")).map((div) => div.innerHTML);

  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the text and adds the transliteration below it", () => {
    const { container } = setupInScript("si", {
      children: "buddho",
      maxLength: 100,
      language: "pi",
    });
    expect(lines(container)).toEqual(["buddho", "බුද්ධො"]);
  });

  it("replaces the text when asked to", () => {
    const { container } = setupInScript(
      "si",
      { children: "buddho", maxLength: 100, language: "pi" },
      "replace",
    );
    expect(lines(container)).toEqual(["බුද්ධො"]);
  });

  it("converts whatever the stored language is", () => {
    const { container } = setupInScript(
      "si",
      { children: "buddho", maxLength: 100, language: "en" },
      "replace",
    );
    expect(container.querySelector("div")?.innerHTML).toBe("බුද්ධො");
  });

  it("keeps line breaks out of the conversion", () => {
    const { container } = setupInScript(
      "si",
      { children: "buddho⤵dhammo", maxLength: 100, language: "pi" },
      "replace",
    );
    expect(container.querySelector("div")?.innerHTML).toBe("බුද්ධො<br>ධම්මො");
  });

  it("adds no second line when the original script is selected", () => {
    const { container } = setupInScript("original", {
      children: "buddho",
      maxLength: 100,
      language: "pi",
    });
    expect(lines(container)).toEqual(["buddho"]);
  });

  it("adds no second line when the caller opts out", () => {
    const { container } = setupInScript("si", {
      children: "buddho",
      maxLength: 100,
      language: "en",
      transliterable: false,
    });
    expect(lines(container)).toEqual(["buddho"]);
    expect(container.querySelector("div")).toHaveClass("en-serif-text");
  });

  it("gives the transliteration line the script's font class", () => {
    const { container } = setupInScript("si", {
      children: "buddho",
      maxLength: 100,
      language: "pi",
    });
    const divs = container.querySelectorAll("div");
    expect(divs[1]).toHaveClass("transliterated-text");
  });

  it("applies the script's font class to the text when replacing", () => {
    const { container } = setupInScript(
      "si",
      { children: "buddho", maxLength: 100, language: "pi" },
      "replace",
    );
    expect(container.querySelector("div")).toHaveClass("transliterated-text");
  });

  it("converts the expanded text too", () => {
    const longPali = "buddho dhammo sangho ".repeat(4).trim();
    setupInScript(
      "si",
      { children: longPali, maxLength: 20, language: "pi" },
      "replace",
    );
    fireEvent.click(screen.getByText("panel.showmore"));
    const contentDiv = document.querySelector("div.text-base");
    expect(contentDiv?.innerHTML).toContain("බුද්ධො");
    expect(contentDiv?.innerHTML).not.toContain("buddho");
  });
});
