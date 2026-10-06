import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  PARTNER_WORK_PATH,
  adjacentArticles,
  articlePath,
  findPartnerWorkArticle,
} from "./partnerWorkContent";
import type { PartnerWorkArticle as Article } from "./partnerWorkContent";
import {
  PartnerWorkInlineMarkdown,
  PartnerWorkMarkdown,
} from "./PartnerWorkMarkdown";

const AdjacentLink = ({
  article,
  direction,
}: {
  article: Article;
  direction: "previous" | "next";
}) => (
  <Link
    to={articlePath(article)}
    className="block rounded-xl border border-custom-border bg-white p-4 transition-colors hover:bg-navbar sm:p-5"
  >
    <span className="overalltext block text-xs font-semibold uppercase tracking-wide text-faded-grey">
      {direction === "previous" ? "← Previous" : "Next →"}
    </span>
    <span className="overalltext mt-1 block text-sm font-medium leading-snug text-foreground">
      {article.title}
    </span>
  </Link>
);

const PartnerWorkArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = findPartnerWorkArticle(slug);

  if (!article) return <Navigate to={PARTNER_WORK_PATH} replace />;

  const { previous, next } = adjacentArticles(article);

  return (
    <>
      <Helmet>
        <title>{`${article.title} — WeBuddhist`}</title>
      </Helmet>

      <div className="min-h-screen bg-white">
        <header className="border-b border-custom-border bg-navbar">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <Link
              to={PARTNER_WORK_PATH}
              className="overalltext text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              ← Partner Work
            </Link>
            <h1 className="en-serif-text mt-4 text-3xl font-medium leading-tight text-foreground sm:text-4xl">
              {article.title}
            </h1>
            {article.subtitle && (
              <p className="overalltext mt-4 text-sm italic leading-relaxed text-muted-foreground sm:text-base">
                <PartnerWorkInlineMarkdown content={article.subtitle} />
              </p>
            )}
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14">
          <PartnerWorkMarkdown content={article.body} />
        </article>

        {(previous || next) && (
          <nav
            aria-label="More posts"
            className="mx-auto grid max-w-3xl gap-4 border-t border-custom-border px-4 py-10 sm:grid-cols-2 sm:px-6"
          >
            <div>
              {previous && (
                <AdjacentLink article={previous} direction="previous" />
              )}
            </div>
            <div className="sm:text-right">
              {next && <AdjacentLink article={next} direction="next" />}
            </div>
          </nav>
        )}
      </div>
    </>
  );
};

export default PartnerWorkArticle;
