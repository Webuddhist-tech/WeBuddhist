import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoBookOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { fetchCollections } from "../../collections/Collections.tsx";
import { collectionPath } from "../../collections/collectionPath.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import SearchField from "./SearchField.tsx";

/**
 * The phone's search: a screen of its own rather than a squeezed field in
 * the bar. The field takes focus straight away, and until something is typed
 * the library's shelves are offered underneath as places to start.
 */
const MobileSearch = ({
  onClose,
  initialQuery = "",
}: {
  onClose: () => void;
  /** What was last searched for, when opened from the results page. */
  initialQuery?: string;
}) => {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  // Same key and fetcher as the library page, so this is usually cached.
  const { data } = useQuery(["collections"], fetchCollections, {
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // The page underneath should not scroll while this covers it.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
    onClose();
  };

  // Portalled to <body>: the top bar's backdrop blur makes it the containing
  // block for fixed children, which would shrink this screen to the bar.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("common.placeholder.search")}
      className="overalltext fixed inset-0 z-50 overflow-y-auto bg-background px-4 pt-3 pb-8"
    >
      <SearchField
        ref={inputRef}
        size="large"
        value={searchTerm}
        onChange={setSearchTerm}
        onSubmit={handleSubmit}
        onDismiss={onClose}
      />

      {data?.collections?.length ? (
        <section className="mt-6">
          <h2 className="font-semibold text-primary">
            {t("home.library_title", "Explore the library")}
          </h2>
          <ul className="mt-3 space-y-1">
            {data.collections.map((collection) => (
              <li key={collection.id}>
                <Link
                  to={collectionPath(collection)}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg py-2"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-search-background text-primary">
                    <IoBookOutline className="size-4" />
                  </span>
                  <span
                    className={cn(
                      "text-primary",
                      getLanguageClass(collection.language || "en"),
                    )}
                  >
                    {collection.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>,
    document.body,
  );
};

export default MobileSearch;
