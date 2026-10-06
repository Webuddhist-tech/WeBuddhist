import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  resolvePartnerWorkHref,
  resolvePartnerWorkImage,
} from "./partnerWorkContent";

type HastNode = { type: string; value?: string; children?: HastNode[] };

const hasText = (node: HastNode | undefined): boolean =>
  !!node &&
  ((node.type === "text" && !!node.value?.trim()) ||
    (node.children ?? []).some(hasText));

const MarkdownLink: Components["a"] = ({ href, children }) => {
  const resolved = resolvePartnerWorkHref(href);
  const className =
    "font-medium text-primary underline-offset-4 hover:underline";

  if (resolved?.startsWith("/")) {
    return (
      <Link to={resolved} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
};

const bodyComponents: Components = {
  h2: ({ children }) => (
    <h2 className="en-serif-text scroll-mt-20 pt-6 text-2xl font-medium text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="en-serif-text pt-2 text-xl font-medium text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="overalltext text-base leading-relaxed text-muted-foreground">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="overalltext list-disc space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="overalltext list-decimal space-y-2 pl-6 text-base leading-relaxed text-muted-foreground">
      {children}
    </ol>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-foreground">{children}</strong>
  ),
  a: MarkdownLink,
  img: ({ src, alt }) => (
    <figure className="space-y-2">
      <img
        src={resolvePartnerWorkImage(typeof src === "string" ? src : "")}
        alt={alt ?? ""}
        loading="lazy"
        className="w-full rounded-xl border border-custom-border bg-white"
      />
      {alt && (
        <figcaption className="overalltext text-center text-sm text-faded-grey">
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  hr: () => <hr className="border-custom-border" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-custom-border">
      <table className="overalltext w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  // Key–value tables in the posts have an empty `| | |` header row; skip it.
  thead: ({ node, children }) =>
    hasText(node) ? (
      <thead className="bg-navbar text-left text-foreground">{children}</thead>
    ) : null,
  tr: ({ children }) => (
    <tr className="border-b border-custom-border last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => <th className="px-4 py-3 font-medium">{children}</th>,
  td: ({ children }) => (
    <td className="px-4 py-3 align-top leading-relaxed text-muted-foreground">
      {children}
    </td>
  ),
};

export const PartnerWorkMarkdown = ({
  content,
  className,
}: {
  content: string;
  className?: string;
}) => (
  <div className={cn("space-y-5", className)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={bodyComponents}>
      {content}
    </ReactMarkdown>
  </div>
);

const inlineComponents: Components = {
  p: ({ children }) => <>{children}</>,
  a: MarkdownLink,
  strong: bodyComponents.strong,
};

/** Renders a single line of markdown (links, emphasis) without block wrappers. */
export const PartnerWorkInlineMarkdown = ({ content }: { content: string }) => (
  <ReactMarkdown components={inlineComponents}>{content}</ReactMarkdown>
);
