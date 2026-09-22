import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, beforeEach, test, expect, describe } from "vitest";
import ViewSelector, { VIEW_MODES, LAYOUT_MODES } from "./ViewSelector.tsx";
import { TransliterationProvider } from "@/context/TransliterationContext.tsx";
import {
  TRANSLITERATION_MODE,
  TRANSLITERATION_SCRIPT,
} from "@/utils/constants.ts";
import { MODE_OPTIONS, SCRIPT_OPTIONS } from "@/utils/transliteration.ts";

vi.mock("@tolgee/react", async () => {
  const actual = await vi.importActual("@tolgee/react");
  return {
    ...actual,
    useTranslate: () => ({
      t: (key: string, defaultValue?: string) => defaultValue ?? key,
    }),
  };
});

vi.mock("@/components/ui/dropdown-menu.tsx", () => ({
  DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="script-menu">{children}</div>
  ),
  DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="script-menu-trigger">{children}</div>
  ),
  DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuRadioGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div
      data-selected={value}
      onClick={(event) => {
        const chosen = (event.target as HTMLElement)
          .closest("[data-value]")
          ?.getAttribute("data-value");
        if (chosen) onValueChange?.(chosen);
      }}
    >
      {children}
    </div>
  ),
  DropdownMenuRadioItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div role="menuitemradio" data-value={value}>
      {children}
    </div>
  ),
}));

describe("ViewSelector Component", () => {
  const setViewMode = vi.fn();
  const setLayoutMode = vi.fn();

  // The script submenu holds radio items of its own, so the view and layout
  // counts below ignore anything inside it.
  const viewAndLayoutItems = () =>
    screen
      .getAllByRole("menuitemradio")
      .filter((item) => !item.closest('[data-testid="script-menu"]'));

  const setup = (
    viewMode = VIEW_MODES.SOURCE,
    layoutMode = LAYOUT_MODES.SEGMENTED,
  ) => {
    return render(
      <ViewSelector
        setViewMode={setViewMode}
        viewMode={viewMode}
        versionSelected={true}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
      />,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders layout label and all menu items", () => {
    setup();
    expect(
      screen.getByText("text.reader_option_menu.layout"),
    ).toBeInTheDocument();

    expect(viewAndLayoutItems()).toHaveLength(5);
  });

  test("renders view mode options with correct labels", () => {
    setup();
    expect(
      screen.getByText("text.reader_option_menu.source"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("text.reader_option_menu.translation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("text.reader_option_menu.source_with_translation"),
    ).toBeInTheDocument();
  });

  test("renders layout options with correct labels", () => {
    setup();
    expect(screen.getByText("Prose")).toBeInTheDocument();
    expect(screen.getByText("Segmented")).toBeInTheDocument();
  });

  test("menu items have correct data-value attributes", () => {
    setup();
    const menuItems = viewAndLayoutItems();

    expect(menuItems[0]).toHaveAttribute("data-value", VIEW_MODES.SOURCE);
    expect(menuItems[1]).toHaveAttribute("data-value", VIEW_MODES.TRANSLATIONS);
    expect(menuItems[2]).toHaveAttribute(
      "data-value",
      VIEW_MODES.SOURCE_AND_TRANSLATIONS,
    );
    expect(menuItems[3]).toHaveAttribute("data-value", LAYOUT_MODES.PROSE);
    expect(menuItems[4]).toHaveAttribute("data-value", LAYOUT_MODES.SEGMENTED);
  });

  test("renders correct number of menu items", () => {
    setup();
    expect(viewAndLayoutItems()).toHaveLength(5);
  });
});

describe("ViewSelector script menu", () => {
  const setViewMode = vi.fn();
  const setLayoutMode = vi.fn();

  const setup = () =>
    render(
      <TransliterationProvider>
        <ViewSelector
          setViewMode={setViewMode}
          viewMode={VIEW_MODES.SOURCE}
          versionSelected={true}
          layoutMode={LAYOUT_MODES.SEGMENTED}
          setLayoutMode={setLayoutMode}
        />
      </TransliterationProvider>,
    );

  // Two rows once a script is chosen: the script itself, then how to show it.
  const row = (index: number) => screen.getAllByTestId("script-menu")[index];
  const trigger = (index: number) =>
    screen.getAllByTestId("script-menu-trigger")[index];
  const scriptMenu = () => row(0);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("shows one row labelled Script for every text", () => {
    setup();
    expect(trigger(0)).toHaveTextContent("Script");
  });

  test("shows Original as the default value on the row", () => {
    setup();
    expect(trigger(0)).toHaveTextContent("Original");
  });

  test("names every option even though Tolgee has no keys for them yet", () => {
    setup();
    // A missing key renders as its own name unless t() is given a default, so
    // this is what stops the menu reading "text.script.sinhala".
    SCRIPT_OPTIONS.forEach((option) => {
      const item = scriptMenu().querySelector(`[data-value="${option.value}"]`);
      expect(item).toHaveTextContent(option.label);
      expect(item).not.toHaveTextContent("text.script.");
    });
  });

  test("offers no source-script choice", () => {
    setup();
    expect(screen.queryByText("From")).not.toBeInTheDocument();
    expect(screen.queryByText("Detect automatically")).not.toBeInTheDocument();
  });

  test("offers the original plus every script in the submenu", () => {
    setup();
    const options = scriptMenu().querySelectorAll("[data-value]");
    expect(options).toHaveLength(SCRIPT_OPTIONS.length);
    expect(
      scriptMenu().querySelector('[data-value="original"]'),
    ).toBeInTheDocument();
    expect(scriptMenu().querySelector('[data-value="tb"]')).toBeInTheDocument();
  });

  test("stores the chosen script so the next chapter opens in it", () => {
    setup();
    fireEvent.click(
      scriptMenu().querySelector('[data-value="si"]') as HTMLElement,
    );
    expect(localStorage.getItem(TRANSLITERATION_SCRIPT)).toBe("si");
  });

  test("shows the chosen script on the row", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "th");
    setup();
    expect(trigger(0)).toHaveTextContent("Thai");
  });

  test("hides the display-mode row until a script is chosen", () => {
    setup();
    expect(screen.getAllByTestId("script-menu")).toHaveLength(1);
    expect(screen.queryByText("Below the text")).not.toBeInTheDocument();
  });

  test("offers below and replace once a script is chosen", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "si");
    setup();
    expect(screen.getAllByTestId("script-menu")).toHaveLength(2);
    expect(trigger(1)).toHaveTextContent("Transliteration");
    expect(row(1).querySelectorAll("[data-value]")).toHaveLength(
      MODE_OPTIONS.length,
    );
  });

  test("defaults to showing the transliteration below the text", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "si");
    setup();
    expect(trigger(1)).toHaveTextContent("Below the text");
  });

  test("stores the chosen display mode", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "si");
    setup();
    fireEvent.click(
      row(1).querySelector('[data-value="replace"]') as HTMLElement,
    );
    expect(localStorage.getItem(TRANSLITERATION_MODE)).toBe("replace");
  });

  test("restores a display mode stored by an earlier session", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "si");
    localStorage.setItem(TRANSLITERATION_MODE, "replace");
    setup();
    expect(trigger(1)).toHaveTextContent("Replace the text");
  });

  test("restores a script stored by an earlier session", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "th");
    setup();
    expect(scriptMenu().querySelector("[data-selected]")).toHaveAttribute(
      "data-selected",
      "th",
    );
  });

  test("ignores a stored script the menu no longer offers", () => {
    localStorage.setItem(TRANSLITERATION_SCRIPT, "klingon");
    setup();
    expect(trigger(0)).toHaveTextContent("Original");
  });
});
