import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { IoChevronForward } from "react-icons/io5";
import { cn } from "@/lib/utils";

/** The soft grey slab every block on the home page sits on. */
export const PANEL_CLASS = "rounded-3xl bg-stone-100";

/** Dark pill button, the page's one call-to-action style. */
export const PRIMARY_ACTION =
  "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90";

/** Outlined companion to PRIMARY_ACTION. */
export const SECONDARY_ACTION =
  "inline-flex items-center justify-center rounded-full border-2 border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground";

type HomeSectionProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  title: string;
  /** Where "See all" goes; the link is left out without one. */
  seeAllTo?: string;
  className?: string;
  children: ReactNode;
};

/**
 * One titled block of the home page: a small red badge naming what it is,
 * a headline saying why it matters, and a "See all" into the full listing.
 */
const HomeSection = ({
  icon: Icon,
  label,
  title,
  seeAllTo,
  className,
  children,
}: HomeSectionProps) => {
  const { t } = useTranslate();
  return (
    <section className={cn(PANEL_CLASS, "p-6 sm:p-10", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-sm font-semibold text-primary">
            <span className="flex size-8 items-center justify-center rounded-full bg-rose-600 text-white">
              <Icon className="size-4" />
            </span>
            {label}
          </p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {title}
          </h2>
        </div>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t("home.see_all", "See all")}
            <IoChevronForward className="size-4" />
          </Link>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
};

/** Placeholder cards while a row of three is loading. */
export const CardRowSkeleton = ({ aspect = "aspect-video" }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2].map((key) => (
      <div key={key} className="animate-pulse space-y-3">
        <div className={cn(aspect, "w-full rounded-xl bg-stone-200")} />
        <div className="h-4 w-4/5 rounded-full bg-stone-200" />
        <div className="h-3 w-1/2 rounded-full bg-stone-200" />
      </div>
    ))}
  </div>
);

export default HomeSection;
