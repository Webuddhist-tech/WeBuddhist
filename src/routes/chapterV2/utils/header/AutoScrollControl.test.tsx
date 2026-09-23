import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, test, expect } from "vitest";
import "@testing-library/jest-dom";
import AutoScrollControl, { AUTO_SCROLL_SPEEDS } from "./AutoScrollControl.tsx";

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
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("AutoScrollControl", () => {
  const onToggle = vi.fn();
  const onSpeedChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderControl = (overrides: Record<string, unknown> = {}) => {
    const user = userEvent.setup();
    render(
      <AutoScrollControl
        isAutoScrolling={false}
        onToggle={onToggle}
        scrollSpeed={AUTO_SCROLL_SPEEDS.NORMAL}
        onSpeedChange={onSpeedChange}
        {...overrides}
      />,
    );
    return user;
  };

  test("renders the section inline, with no trigger to open first", () => {
    renderControl();
    expect(screen.getByText("Auto-scroll")).toBeInTheDocument();
    expect(
      screen.getByLabelText("text.reader_option_menu.auto_scroll_play"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    ).toBeInTheDocument();
  });

  test("names the selected speed between the step buttons", () => {
    renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.VERY_FAST });
    expect(screen.getByText("Very fast")).toBeInTheDocument();
  });

  test("falls back to the slowest preset label for an unknown speed", () => {
    renderControl({ scrollSpeed: 999 });
    expect(screen.getByText("Slow")).toBeInTheDocument();
  });

  test("clicking the toggle calls onToggle", async () => {
    const user = renderControl();
    await user.click(
      screen.getByLabelText("text.reader_option_menu.auto_scroll_play"),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("shows the pause affordance while auto-scrolling", () => {
    renderControl({ isAutoScrolling: true });
    expect(
      screen.getByLabelText("text.reader_option_menu.auto_scroll_pause"),
    ).toBeInTheDocument();
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  test("clicking increase steps to the next speed preset", async () => {
    const user = renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.NORMAL });
    await user.click(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    );
    expect(onSpeedChange).toHaveBeenCalledWith(AUTO_SCROLL_SPEEDS.FAST);
  });

  test("clicking decrease steps to the previous speed preset", async () => {
    const user = renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.NORMAL });
    await user.click(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    );
    expect(onSpeedChange).toHaveBeenCalledWith(AUTO_SCROLL_SPEEDS.SLOW);
  });

  test("disables decrease at the slowest preset", () => {
    renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.SLOW });
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    ).toBeEnabled();
  });

  test("disables increase at the fastest preset", () => {
    renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.VERY_FAST });
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    ).toBeEnabled();
  });

  test("does not call onSpeedChange when a disabled step button is clicked", async () => {
    const user = renderControl({ scrollSpeed: AUTO_SCROLL_SPEEDS.SLOW });
    await user.click(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    );
    expect(onSpeedChange).not.toHaveBeenCalled();
  });
});
