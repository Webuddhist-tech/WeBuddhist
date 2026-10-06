import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArticleList } from "./ArticleList";
import {
  partnerWorkIndex,
  partnerWorkMilestones,
  partnerWorkSteps,
} from "./partnerWorkContent";
import {
  PartnerWorkInlineMarkdown,
  PartnerWorkMarkdown,
} from "./PartnerWorkMarkdown";

const STEP_BARS = ["#802F3E", "#102544", "#18345d", "#0f479a"];

const sectionSlug = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** The index body before its first `## ` heading: the intro and the overview chart. */
const introMarkdown = partnerWorkIndex.body.split(/^## /m)[0].trim();

const SectionHeading = ({ heading, bar }: { heading: string; bar: string }) => (
  <div className="mb-6 space-y-3">
    <div
      className="h-1 w-16 rounded-full"
      style={{ backgroundColor: bar }}
      aria-hidden="true"
    />
    <h2
      id={sectionSlug(heading)}
      className="en-serif-text scroll-mt-20 text-2xl font-medium text-foreground sm:text-3xl"
    >
      {heading}
    </h2>
  </div>
);

const PartnerWork = () => (
  <>
    <Helmet>
      <title>Partner Work — WeBuddhist</title>
      <meta name="description" content={partnerWorkIndex.subtitle} />
    </Helmet>

    <div className="min-h-screen bg-white">
      <header className="border-b border-custom-border bg-navbar">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            to="/about#partner-work"
            className="overalltext text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← About
          </Link>
          <h1 className="en-serif-text mt-4 text-3xl font-medium leading-tight text-foreground sm:text-4xl">
            {partnerWorkIndex.title}
          </h1>
          <p className="overalltext mt-4 text-base italic leading-relaxed text-muted-foreground">
            {partnerWorkIndex.subtitle}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="py-12 sm:py-14">
          <PartnerWorkMarkdown content={introMarkdown} />
        </section>

        {partnerWorkSteps.map((step, index) => (
          <section
            key={step.heading}
            aria-labelledby={sectionSlug(step.heading)}
            className="border-t border-custom-border py-12 sm:py-14"
          >
            <SectionHeading
              heading={step.heading}
              bar={STEP_BARS[index % STEP_BARS.length]}
            />
            {step.articles.length > 0 && (
              <ArticleList articles={step.articles} />
            )}
            {step.notes.map((note) => (
              <p
                key={note}
                className={cn(
                  "overalltext text-base leading-relaxed text-muted-foreground",
                  step.articles.length > 0 && "mt-5",
                )}
              >
                <PartnerWorkInlineMarkdown content={note} />
              </p>
            ))}
          </section>
        ))}

        {partnerWorkMilestones.length > 0 && (
          <section
            aria-labelledby={sectionSlug("Milestone updates")}
            className="border-t border-custom-border py-12 sm:py-14"
          >
            <SectionHeading heading="Milestone updates" bar="#102544" />
            <p className="overalltext mb-6 text-base leading-relaxed text-muted-foreground">
              The same work told milestone by milestone, as it happened.
            </p>
            <ArticleList articles={partnerWorkMilestones} numbered={false} />
          </section>
        )}
      </div>
    </div>
  </>
);

export default PartnerWork;
