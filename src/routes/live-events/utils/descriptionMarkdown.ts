import type { Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkBreaks from "remark-breaks";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { PluggableList } from "unified";

/** Cap excerpt parsing so list cards never walk megabyte descriptions. */
export const EXCERPT_MARKDOWN_PARSE_LIMIT = 4096;

export const eventDescriptionRemarkPlugins: PluggableList = [remarkBreaks];

export const markdownToPlainText = (markdown: string): string => {
  const tree = unified()
    .use(remarkParse)
    .use(remarkBreaks)
    .parse(markdown) as Root;

  const chunks: string[] = [];
  for (const node of tree.children) {
    const piece = toString(node).trim();
    if (piece) chunks.push(piece);
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim();
};
