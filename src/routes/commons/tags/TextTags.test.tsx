import { render, screen } from "@testing-library/react";
import * as reactQuery from "react-query";
import { QueryClient, QueryClientProvider } from "react-query";
import { TolgeeProvider } from "@tolgee/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { mockTolgee } from "../../../test-utils/CommonMocks.js";
import TextTags from "./TextTags.js";

vi.mock("@/services/library", () => ({
  getTags: vi.fn(),
}));

const tags = [
  { id: "tag-1", title: "Vajrayāna", description: null },
  { id: "tag-2", title: "Chants", description: null },
];

const mockTagQuery = (data: unknown) => {
  vi.spyOn(reactQuery, "useQuery").mockImplementation(
    () => ({ data, isLoading: false }) as any,
  );
};

const setup = (tagIds?: string[] | null) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TolgeeProvider fallback={"Loading tolgee..."} tolgee={mockTolgee}>
        <TextTags tagIds={tagIds} />
      </TolgeeProvider>
    </QueryClientProvider>,
  );
};

describe("TextTags", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockTagQuery(tags);
  });

  test("labels every tag the text carries", () => {
    setup(["tag-1", "tag-2"]);
    expect(screen.getByText("Vajrayāna")).toBeInTheDocument();
    expect(screen.getByText("Chants")).toBeInTheDocument();
  });

  test("drops ids the tag list does not know", () => {
    const { container } = setup(["tag-1", "gone"]);
    expect(screen.getByText("Vajrayāna")).toBeInTheDocument();
    expect(container.textContent).not.toContain("gone");
  });

  test("renders nothing for a text without tags", () => {
    expect(setup([]).container).toBeEmptyDOMElement();
    expect(setup(undefined).container).toBeEmptyDOMElement();
  });

  test("renders nothing while the tag list is still unknown", () => {
    mockTagQuery(undefined);
    expect(setup(["tag-1"]).container).toBeEmptyDOMElement();
  });
});
