import type { ReactNode } from "react";
import { useTranslate } from "@tolgee/react";
import { cn } from "@/lib/utils";

/** How many results a section shows before it is expanded. */
export const PREVIEW_COUNT = 3;

/** The bordered card every result sits in. */
export const RESULT_CARD =
  "group block rounded-xl border border-custom-border bg-background p-4 transition hover:border-faded-grey/40 hover:shadow-sm sm:p-5";

/** Placeholder cards while a category's first page loads. */
export const ResultSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3" aria-busy="true">
    {Array.from({ length: rows }, (_, key) => (
      <div
        key={key}
        className="animate-pulse rounded-xl border border-custom-border p-5"
      >
        <div className="h-4 w-2/3 rounded-full bg-search-background" />
        <div className="mt-3 h-3 w-1/3 rounded-full bg-search-background" />
      </div>
    ))}
  </div>
);

export const NoResults = () => {
  const { t } = useTranslate();
  return (
    <p className="rounded-xl border border-dashed border-custom-border p-6 text-center text-faded-grey">
      {t("search.zero_result", "No results to display.")}
    </p>
  );
};

/** Loads the next page of an expanded section. */
export const ShowMore = ({
  onClick,
  isLoading,
}: {
  onClick: () => void;
  isLoading: boolean;
}) => {
  const { t } = useTranslate();
  return (
    <div className="pt-2 text-center">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="rounded-full border-2 border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {isLoading
          ? t("common.loading", "Loading…")
          : t("search_page.show_more", "Show more")}
      </button>
    </div>
  );
};

/** A small rounded thumbnail on the left of a result card. */
export const Thumb = ({
  src,
  className,
  fallback,
}: {
  src?: string | null;
  className?: string;
  fallback?: ReactNode;
}) => (
  <div
    className={cn(
      "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-search-background",
      className,
    )}
  >
    {src ? (
      <img src={src} alt="" className="h-full w-full object-cover" />
    ) : (
      fallback
    )}
  </div>
);
