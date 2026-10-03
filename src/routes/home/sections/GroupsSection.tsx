import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { cn } from "@/lib/utils";
import { IoPeopleOutline } from "react-icons/io5";
import { fetchPublicGroups } from "../../mantras/api/accumulatorApi.ts";
import { getGroupTitleForLanguage } from "../../mantras/utils/groupUtils.ts";
import { groupAddress } from "../../groups/utils/groupHandle.ts";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
import HomeSection from "../components/HomeSection.tsx";

type GroupsSectionProps = {
  apiLanguage: string;
  planLanguage: PlanLanguageCode;
};

const TILE_COUNT = 6;

/** Group names come in any script; Tibetan ones need the Tibetan face. */
const TIBETAN = /[\u0F00-\u0FFF]/;

/** Initials for a group with no logo of its own. */
const initials = (title: string) =>
  title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

/**
 * Six practice communities as tiles - logo on white, name underneath -
 * each opening the group's own page.
 */
const GroupsSection = ({ apiLanguage, planLanguage }: GroupsSectionProps) => {
  const { t } = useTranslate();
  const { data, isLoading } = useQuery(
    ["public-groups-home", apiLanguage],
    () => fetchPublicGroups(apiLanguage, 24),
    { refetchOnWindowFocus: false },
  );
  // Groups with a logo read far better as tiles, so they go first.
  const groups = [...(data?.groups ?? [])]
    .sort(
      (a, b) => Number(Boolean(b.avatar_url)) - Number(Boolean(a.avatar_url)),
    )
    .slice(0, TILE_COUNT);

  if (!isLoading && groups.length === 0) return null;

  return (
    <HomeSection
      icon={IoPeopleOutline}
      label={t("mantras.joinable_groups", "Practice spaces")}
      title={t("home.groups_title", "Practise alongside others")}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: TILE_COUNT }, (_, key) => (
              <div key={key} className="animate-pulse space-y-3">
                <div className="aspect-square rounded-2xl bg-stone-200" />
                <div className="mx-auto h-3 w-3/4 rounded-full bg-stone-200" />
              </div>
            ))
          : groups.map((group) => {
              const title = getGroupTitleForLanguage(
                group.metadata,
                planLanguage,
              );
              return (
                <Link
                  key={group.id}
                  to={groupAddress(group)}
                  className="group block text-center"
                >
                  <div className="flex aspect-square items-center justify-center rounded-2xl bg-white p-5 transition group-hover:shadow-md">
                    {group.avatar_url ? (
                      <img
                        src={group.avatar_url}
                        alt=""
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center rounded-full bg-rose-100 text-xl font-semibold text-rose-700">
                        {initials(title)}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mt-3 line-clamp-2 text-sm text-primary group-hover:underline",
                      TIBETAN.test(title) && "bo-text",
                    )}
                  >
                    {title}
                  </p>
                </Link>
              );
            })}
      </div>
    </HomeSection>
  );
};

export default GroupsSection;
