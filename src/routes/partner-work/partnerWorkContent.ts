const postFiles = import.meta.glob("./content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const milestoneFiles = import.meta.glob("./content/milestones/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const imageFiles = import.meta.glob("./content/images/*", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const PARTNER_WORK_PATH = "/about/partner-work";

const INDEX_FILE = "00-index.md";

export type PartnerWorkArticle = {
  slug: string;
  fileName: string;
  kind: "post" | "milestone";
  title: string;
  /** The italic line under the title (series note or milestone navigation). */
  subtitle: string;
  body: string;
};

export type PartnerWorkStep = {
  heading: string;
  articles: PartnerWorkArticle[];
  /** Text under the step heading that is not a link to a post. */
  notes: string[];
};

const fileNameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** `03-ocr-evaluation-benchmark.md` → `ocr-evaluation-benchmark`. */
const slugOf = (fileName: string) =>
  fileName.replace(/\.md$/, "").replace(/^\d+-/, "");

const stripItalics = (line: string) => line.replace(/^\*(.+)\*$/, "$1");

/** Splits a post into its `# ` title, the italic line under it, and the body after `---`. */
const parseArticle = (
  fileName: string,
  raw: string,
  kind: PartnerWorkArticle["kind"],
): PartnerWorkArticle => {
  const text = raw.trim();
  const titleMatch = /^# (.+)$/m.exec(text);
  const [head, ...rest] = text.split(/^---\s*$/m);
  const subtitleLine = head
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^\*.+\*$/.test(line));

  return {
    slug: slugOf(fileName),
    fileName,
    kind,
    title: titleMatch?.[1].trim() ?? slugOf(fileName),
    subtitle: subtitleLine ? stripItalics(subtitleLine) : "",
    body: rest.length > 0 ? rest.join("---").trim() : text,
  };
};

const byFileName = (a: [string, string], b: [string, string]) =>
  fileNameOf(a[0]).localeCompare(fileNameOf(b[0]));

const indexEntry = Object.entries(postFiles).find(
  ([path]) => fileNameOf(path) === INDEX_FILE,
);

/** The series landing page (`00-index.md`). */
export const partnerWorkIndex = parseArticle(
  INDEX_FILE,
  indexEntry?.[1] ?? "",
  "post",
);

export const partnerWorkPosts: PartnerWorkArticle[] = Object.entries(postFiles)
  .filter(([path]) => fileNameOf(path) !== INDEX_FILE)
  .sort(byFileName)
  .map(([path, raw]) => parseArticle(fileNameOf(path), raw, "post"));

export const partnerWorkMilestones: PartnerWorkArticle[] = Object.entries(
  milestoneFiles,
)
  .sort(byFileName)
  .map(([path, raw]) => parseArticle(fileNameOf(path), raw, "milestone"));

const articlesByFileName = new Map(
  [...partnerWorkPosts, ...partnerWorkMilestones].map((article) => [
    article.fileName,
    article,
  ]),
);

const articlesBySlug = new Map(
  [...partnerWorkPosts, ...partnerWorkMilestones].map((article) => [
    article.slug,
    article,
  ]),
);

export const findPartnerWorkArticle = (slug: string | undefined) =>
  slug ? articlesBySlug.get(slug) : undefined;

export const articlePath = (article: PartnerWorkArticle) =>
  `${PARTNER_WORK_PATH}/${article.slug}`;

/** Maps a relative `.md` link inside a post to its route on the site. */
export const resolvePartnerWorkHref = (href: string | undefined) => {
  if (!href) return href;
  const fileName = fileNameOf(href.split("#")[0]);
  if (!fileName.endsWith(".md")) return href;
  if (fileName === INDEX_FILE) return PARTNER_WORK_PATH;
  const article = articlesByFileName.get(fileName);
  return article ? articlePath(article) : href;
};

/** Maps a relative `images/…` source inside a post to its bundled URL. */
export const resolvePartnerWorkImage = (src: string | undefined) => {
  if (!src) return src;
  return imageFiles[`./content/images/${fileNameOf(src)}`] ?? src;
};

/** The body of the index split at its `## ` headings. */
const indexSections = partnerWorkIndex.body
  .split(/^## /m)
  .map((chunk, index) => {
    if (index === 0) return { heading: "", body: chunk.trim() };
    const newlineIndex = chunk.indexOf("\n");
    return {
      heading: chunk.slice(0, newlineIndex).trim(),
      body: chunk.slice(newlineIndex + 1).trim(),
    };
  });

const LINK_PATTERN = /\[[^\]]*\]\(([^)]+\.md)\)/;

/** The intro paragraphs of the index, without images. */
export const partnerWorkIntro = indexSections[0].body
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter((paragraph) => paragraph && !paragraph.startsWith("!["));

/** The steps of the series as listed in the index, each with its posts. */
export const partnerWorkSteps: PartnerWorkStep[] = indexSections
  .slice(1)
  .map(({ heading, body }) => {
    const articles: PartnerWorkArticle[] = [];
    const notes: string[] = [];

    body
      .split(/\n\s*\n/)
      .flatMap((paragraph) =>
        /^\d+\./.test(paragraph.trim()) ? paragraph.split("\n") : [paragraph],
      )
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const link = LINK_PATTERN.exec(line);
        const article = link
          ? articlesByFileName.get(fileNameOf(link[1]))
          : undefined;
        if (article) articles.push(article);
        else notes.push(line);
      });

    return { heading, articles, notes };
  });

/** Steps that list posts (the index's closing sections hold only notes). */
export const partnerWorkStepsWithPosts = partnerWorkSteps.filter(
  (step) => step.articles.length > 0,
);

/** Previous and next post in reading order, within the same kind. */
export const adjacentArticles = (article: PartnerWorkArticle) => {
  const list =
    article.kind === "post" ? partnerWorkPosts : partnerWorkMilestones;
  const index = list.findIndex((item) => item.slug === article.slug);
  return {
    previous: index > 0 ? list[index - 1] : undefined,
    next: index < list.length - 1 ? list[index + 1] : undefined,
  };
};
