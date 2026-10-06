import { Link } from "react-router-dom";
import { articlePath } from "./partnerWorkContent";
import type { PartnerWorkArticle } from "./partnerWorkContent";

export const ArticleList = ({
  articles,
  numbered = true,
}: {
  articles: PartnerWorkArticle[];
  numbered?: boolean;
}) => (
  <ol className="divide-y divide-custom-border overflow-hidden rounded-xl border border-custom-border bg-white">
    {articles.map((article) => (
      <li key={article.slug}>
        <Link
          to={articlePath(article)}
          className="flex items-baseline gap-4 px-5 py-4 transition-colors hover:bg-navbar sm:px-6"
        >
          {numbered && (
            <span
              className="overalltext w-6 shrink-0 text-sm font-semibold text-faded-grey"
              aria-hidden="true"
            >
              {article.fileName.match(/^\d+/)?.[0]}
            </span>
          )}
          <span className="overalltext text-sm font-medium leading-relaxed text-foreground sm:text-base">
            {article.title}
          </span>
        </Link>
      </li>
    ))}
  </ol>
);
