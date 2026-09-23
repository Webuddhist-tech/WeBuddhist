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
      t: (key: string) => key,
    }),
  };
});

describe("AutoScrollControl", () => {
  const onToggle = vi.fn();
  const onSpeedChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderControl = (overrides: Record<string, unknown> = {}) =>
    render(
      <AutoScrollControl
        isAutoScrolling={false}
        onToggle={onToggle}
        scrollSpeed={AUTO_SCROLL_SPEEDS.NORMAL}
        onSpeedChange={onSpeedChange}
        {...overrides}
      />,
    );

  const openPopover = async (overrides: Record<string, unknown> = {}) => {
    const user = userEvent.setup();
    renderControl(overrides);
    await user.click(
      screen.getByLabelText("text.reader_option_menu.auto_scroll"),
    );
    return user;
  };

  test("renders only the trigger icon until clicked", () => {
    renderControl();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.getByLabelText("text.reader_option_menu.auto_scroll"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("text.reader_option_menu.auto_scroll_play"),
    ).not.toBeInTheDocument();
  });

  test("clicking the trigger opens a popover with decrease, toggle, and increase buttons", async () => {
    await openPopover();
    expect(
      await screen.findByLabelText("text.reader_option_menu.auto_scroll_play"),
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

  test("clicking the toggle button calls onToggle", async () => {
    const user = await openPopover();
    await user.click(
      await screen.findByLabelText("text.reader_option_menu.auto_scroll_play"),
    );
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("shows pause label and stop icon while auto-scrolling", async () => {
    await openPopover({ isAutoScrolling: true });
    expect(
      await screen.findByLabelText("text.reader_option_menu.auto_scroll_pause"),
    ).toBeInTheDocument();
  });

  test("clicking increase steps to the next speed preset", async () => {
    const user = await openPopover({ scrollSpeed: AUTO_SCROLL_SPEEDS.NORMAL });
    await user.click(
      await screen.findByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    );
    expect(onSpeedChange).toHaveBeenCalledWith(AUTO_SCROLL_SPEEDS.FAST);
  });

  test("clicking decrease steps to the previous speed preset", async () => {
    const user = await openPopover({ scrollSpeed: AUTO_SCROLL_SPEEDS.NORMAL });
    await user.click(
      await screen.findByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    );
    expect(onSpeedChange).toHaveBeenCalledWith(AUTO_SCROLL_SPEEDS.SLOW);
  });

  test("disables decrease at the slowest preset", async () => {
    await openPopover({ scrollSpeed: AUTO_SCROLL_SPEEDS.SLOW });
    expect(
      await screen.findByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(
        "text.reader_option_menu.auto_scroll_speed_increase",
      ),
    ).toBeEnabled();
  });

  test("disables increase at the fastest preset", async () => {
    await openPopover({ scrollSpeed: AUTO_SCROLL_SPEEDS.VERY_FAST });
    expect(
      await screen.findByLabelText(
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
    const user = await openPopover({ scrollSpeed: AUTO_SCROLL_SPEEDS.SLOW });
    await user.click(
      await screen.findByLabelText(
        "text.reader_option_menu.auto_scroll_speed_decrease",
      ),
    );
    expect(onSpeedChange).not.toHaveBeenCalled();
  });
});
