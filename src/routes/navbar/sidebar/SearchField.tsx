import { forwardRef, type FormEvent } from "react";
import { useTranslate } from "@tolgee/react";
import { IoArrowForward, IoClose, IoSearch } from "react-icons/io5";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called with the trimmed query; never with an empty one. */
  onSubmit: (query: string) => void;
  /** What the ✕ beside the field does; it is left out without this. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Taller on the phone's search screen, where it is the only thing. */
  size?: "default" | "large";
  className?: string;
};

/**
 * The site's search box, the same on every screen. Empty, a soft grey pill;
 * once something is typed, an outlined pill with the search icon at one end
 * and a submit arrow at the other, a close button standing apart beside it.
 */
const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    {
      value,
      onChange,
      onSubmit,
      onDismiss,
      dismissLabel,
      size = "default",
      className,
    },
    ref,
  ) {
    const { t } = useTranslate();
    const large = size === "large";

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const query = value.trim();
      if (query) onSubmit(query);
    };

    // Empty, it is the quiet grey pill; with something typed it firms up -
    // an outline, and the arrow to send it. The border is there either way
    // (transparent while empty) so the text does not shift as it changes.
    const hasText = value.length > 0;

    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <form
          role="search"
          onSubmit={handleSubmit}
          className={cn(
            "flex min-w-0 flex-1 items-center rounded-full border-[1.5px] transition-colors",
            large ? "h-12 gap-2.5 pl-4" : "h-9 gap-2 pl-3.5",
            hasText
              ? "border-primary bg-background pr-1"
              : cn(
                  "border-transparent bg-search-background",
                  large ? "pr-4" : "pr-3.5",
                ),
          )}
        >
          <IoSearch
            className={cn(
              "shrink-0",
              hasText ? "text-primary" : "text-faded-grey",
              large ? "size-[18px]" : "size-4",
            )}
          />
          <input
            ref={ref}
            type="search"
            enterKeyHint="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t(
              "search_page.placeholder",
              "Search plans, texts, verses, etc.",
            )}
            aria-label={t("common.placeholder.search")}
            // The submit arrow and the ✕ replace the browser's clear button.
            className={cn(
              "w-full min-w-0 border-none bg-transparent text-primary outline-none placeholder:text-faded-grey [&::-webkit-search-cancel-button]:appearance-none",
              large ? "text-base" : "text-sm",
            )}
          />
          {hasText && (
            <button
              type="submit"
              aria-label={t("common.placeholder.search")}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-search-background",
                large ? "size-9" : "size-7",
              )}
            >
              <IoArrowForward className={large ? "size-5" : "size-[18px]"} />
            </button>
          )}
        </form>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel ?? t("common.close", "Close")}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-search-background",
              large ? "size-10" : "size-9",
            )}
          >
            <IoClose className={large ? "size-6" : "size-5"} />
          </button>
        )}
      </div>
    );
  },
);

export default SearchField;
