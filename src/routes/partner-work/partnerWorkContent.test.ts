import { describe, expect, test } from "vitest";
import {
  PARTNER_WORK_PATH,
  findPartnerWorkArticle,
  partnerWorkIndex,
  partnerWorkIntro,
  partnerWorkMilestones,
  partnerWorkPosts,
  partnerWorkStepsWithPosts,
  resolvePartnerWorkHref,
  resolvePartnerWorkImage,
} from "./partnerWorkContent";

const allArticles = [...partnerWorkPosts, ...partnerWorkMilestones];

describe("partner work content", () => {
  test("parses the series index", () => {
    expect(partnerWorkIndex.title).toMatch(/BDRC E-Text Corpus/);
    expect(partnerWorkIntro.length).toBeGreaterThan(0);
  });

  test("lists every post under a step, in order", () => {
    expect(partnerWorkStepsWithPosts.map((step) => step.heading)).toEqual([
      "Step 1: the gold standard",
      "Step 2: OCR and its training data",
      "Step 3: the catalog",
      "Step 4: the corpus",
    ]);
    const listed = partnerWorkStepsWithPosts.flatMap((step) => step.articles);
    expect(listed).toEqual(partnerWorkPosts);
  });

  test("loads the milestone posts", () => {
    expect(partnerWorkMilestones).toHaveLength(6);
    expect(partnerWorkMilestones[0].slug).toBe(
      "overview-building-the-bdrc-etext-corpus",
    );
  });

  test("gives every article a title and a unique slug", () => {
    const slugs = new Set(allArticles.map((article) => article.slug));
    expect(slugs.size).toBe(allArticles.length);
    allArticles.forEach((article) => {
      expect(article.title).not.toMatch(/^#/);
      expect(findPartnerWorkArticle(article.slug)).toBe(article);
    });
  });

  test("resolves every markdown link to a route", () => {
    const links = allArticles.flatMap((article) =>
      [
        ...`${article.subtitle}\n${article.body}`.matchAll(
          /\]\(([^)]+\.md)\)/g,
        ),
      ].map((match) => match[1]),
    );
    expect(links.length).toBeGreaterThan(0);
    links.forEach((href) => {
      expect(resolvePartnerWorkHref(href)).toMatch(
        new RegExp(`^${PARTNER_WORK_PATH}`),
      );
    });
  });

  test("resolves every image to a bundled file", () => {
    const images = [partnerWorkIndex, ...allArticles].flatMap((article) =>
      [...article.body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(
        (match) => match[1],
      ),
    );
    expect(images.length).toBeGreaterThan(0);
    images.forEach((src) => {
      expect(resolvePartnerWorkImage(src)).not.toBe(src);
    });
  });
});
