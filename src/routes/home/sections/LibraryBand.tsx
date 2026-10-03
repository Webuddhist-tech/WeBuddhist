import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { cn } from "@/lib/utils";
import { fetchCollections } from "../../collections/Collections.tsx";
import { collectionPath } from "../../collections/collectionPath.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";

/**
 * The library's top-level collections as a cloud of pills on a dark band -
 * the quickest way from the front page into a particular shelf.
 */
const LibraryBand = () => {
  const { t } = useTranslate();
  // Same key and fetcher as the library page, so the two share a request.
  const { data, isLoading } = useQuery(["collections"], fetchCollections, {
    refetchOnWindowFocus: false,
  });
  const collections = data?.collections ?? [];

  if (!isLoading && collections.length === 0) return null;

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#0a1729] via-[#102544] to-[#2a1a2e] px-6 py-12 text-center sm:px-12 sm:py-16">
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        {t("home.library_title", "Explore the library")}
      </h2>
      <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
        {isLoading
          ? [0, 1, 2, 3, 4, 5].map((key) => (
              <span
                key={key}
                className="h-10 w-28 animate-pulse rounded-full bg-white/10"
              />
            ))
          : collections.map((collection) => (
              <Link
                key={collection.id}
                to={collectionPath(collection)}
                className={cn(
                  "rounded-full border-2 border-white/80 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-primary",
                  getLanguageClass(collection.language || "en"),
                )}
              >
                {collection.title}
              </Link>
            ))}
      </div>
    </section>
  );
};

export default LibraryBand;
