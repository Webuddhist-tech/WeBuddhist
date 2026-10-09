import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  parseReaderOptions,
  readerOptionsQuery,
  ReaderFeaturesProvider,
  useReaderFeature,
} from "./ReaderFeaturesContext";

describe("parseReaderOptions", () => {
  it("shows everything when the address says nothing", () => {
    const options = parseReaderOptions(new URLSearchParams(""));
    expect(options.hidden.size).toBe(0);
    expect(options.layout).toBeUndefined();
    expect(options.titles).toBeUndefined();
  });

  it("reads the hidden features, ignoring unknown ids and spaces", () => {
    const options = parseReaderOptions(
      new URLSearchParams("hide=search, ai,nonsense,autoscroll"),
    );
    expect([...options.hidden].sort()).toEqual(["ai", "autoscroll", "search"]);
  });

  it("reads layout and titles, ignoring values it does not know", () => {
    expect(
      parseReaderOptions(new URLSearchParams("layout=prose&titles=hidden")),
    ).toMatchObject({ layout: "prose", titles: "hidden" });
    expect(
      parseReaderOptions(new URLSearchParams("layout=wide&titles=x")),
    ).toMatchObject({ layout: undefined, titles: undefined });
  });
});

describe("readerOptionsQuery", () => {
  it("leaves out whatever is at its default", () => {
    expect(readerOptionsQuery({ hidden: new Set() }).toString()).toBe("");
  });

  it("round-trips through parseReaderOptions", () => {
    const query = readerOptionsQuery({
      hidden: new Set(["search", "compare"]),
      layout: "segmented",
      titles: "shown",
    });
    const options = parseReaderOptions(query);
    expect([...options.hidden].sort()).toEqual(["compare", "search"]);
    expect(options.layout).toBe("segmented");
    expect(options.titles).toBe("shown");
  });
});

describe("useReaderFeature", () => {
  const Probe = () => (
    <p>
      {useReaderFeature("search") ? "search on" : "search off"}
      {useReaderFeature("ai") ? " ai on" : " ai off"}
    </p>
  );

  it("is on everywhere there is no provider", () => {
    render(<Probe />);
    expect(screen.getByText("search on ai on")).toBeInTheDocument();
  });

  it("is off for what the provider hides", () => {
    render(
      <ReaderFeaturesProvider options={{ hidden: new Set(["search"]) }}>
        <Probe />
      </ReaderFeaturesProvider>,
    );
    expect(screen.getByText("search off ai on")).toBeInTheDocument();
  });
});
