import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import DailyTaskRow from "./DailyTaskRow.tsx";
import { DailyAudioProvider } from "../context/DailyAudioContext.tsx";
import type { TaskDTO } from "../types.ts";

vi.mock("@tolgee/react", () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

const PRESIGNED_URL =
  "https://bucket.s3.amazonaws.com/images/plan_images/tara.jpg?X-Amz-Signature=abc";

function renderTask(task: TaskDTO) {
  render(
    <DailyAudioProvider primaryAudioId={null} dayKey="day-1">
      <DailyTaskRow task={task} index={0} />
    </DailyAudioProvider>,
  );
  fireEvent.click(screen.getByRole("button", { expanded: false }));
}

describe("DailyTaskRow", () => {
  test("renders image and markdown text subtasks in the same task", () => {
    renderTask({
      id: "task-1",
      title: "Meet Tara",
      subtasks: [
        {
          id: "sub-text",
          content_type: "TEXT",
          content: "## Tara\n\n**Name** : Tara Who Dispels All Poverty",
          display_order: 2,
        },
        {
          id: "sub-image",
          content_type: "IMAGE",
          content: PRESIGNED_URL,
          image_url: "images/plan_images/tara.jpg",
          display_order: 1,
        },
      ],
    });

    const image = document.querySelector("img");
    expect(image).toHaveAttribute("src", PRESIGNED_URL);
    expect(screen.queryByText(PRESIGNED_URL)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tara" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toHaveClass("font-semibold");

    // Display order is respected: image comes before the text.
    const heading = screen.getByRole("heading", { name: "Tara" });
    expect(
      image!.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("renders a YouTube video subtask as an embed", () => {
    renderTask({
      id: "task-2",
      title: "Watch",
      subtasks: [
        {
          id: "sub-video",
          content_type: "VIDEO",
          content: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        },
      ],
    });

    expect(screen.getByTitle("YouTube video")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  test("renders a reference subtask as a card", () => {
    renderTask({
      id: "task-3",
      title: "Join in",
      subtasks: [
        {
          id: "sub-event",
          content_type: "EVENT",
          content: "",
          reference: {
            id: "event-1",
            content_type: "EVENT",
            title: "Tara Puja",
            subtitle: "Sunday gathering",
          },
        },
      ],
    });

    expect(screen.getByText("Tara Puja")).toBeInTheDocument();
    expect(screen.getByText("Sunday gathering")).toBeInTheDocument();
  });

  test("keeps source reference line breaks as plain text", () => {
    renderTask({
      id: "task-4",
      title: "Chant",
      subtasks: [
        {
          id: "sub-src",
          content_type: "SOURCE_REFERENCE",
          content: "First line\nSecond line",
        },
      ],
    });

    expect(screen.getByText("First line")).toBeInTheDocument();
    expect(screen.getByText("Second line")).toBeInTheDocument();
  });
});
