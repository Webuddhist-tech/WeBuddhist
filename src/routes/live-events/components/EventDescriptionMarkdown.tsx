import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { safeExternalUrl } from "../utils/eventUtils.ts";

type EventDescriptionMarkdownProps = {
  content: string;
  className?: string;
};

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-slate-700 sm:text-[15px] sm:leading-7 [&:not(:first-child)]:mt-4">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700 sm:text-[15px]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700 sm:text-[15px]">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h2: ({ children }) => (
    <h2 className="mt-6 text-base font-semibold text-[#102544] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 text-sm font-semibold text-[#102544]">{children}</h3>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-slate-300 pl-4 text-sm italic text-slate-600 sm:text-[15px]">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    const safeHref = safeExternalUrl(href ?? "");
    if (!safeHref) {
      return <span className="text-slate-700">{children}</span>;
    }
    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#102544] underline underline-offset-2 hover:text-[#102544]/80"
      >
        {children}
      </a>
    );
  },
};

const EventDescriptionMarkdown = ({
  content,
  className = "",
}: EventDescriptionMarkdownProps) => (
  <div className={`min-w-0 ${className}`}>
    <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
  </div>
);

export default EventDescriptionMarkdown;
