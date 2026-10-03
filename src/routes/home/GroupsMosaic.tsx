import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { fetchPublicGroups } from "../mantras/api/accumulatorApi.ts";
import { getGroupTitleForLanguage } from "../mantras/utils/groupUtils.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import PanelWord from "./PanelWord.tsx";
import type { PlanLanguageCode } from "../planviewer/utils/seriesUtils.ts";

type GroupsMosaicProps = {
  apiLanguage: string;
  language: PlanLanguageCode;
};

/** Enough to read as "a lot of groups" at a glance. */
const TILE_COUNT = 15;

/** Avatars per row, so the crowd staggers instead of forming a block. */
const ROW_LENGTHS = [6, 5, 4];

const initialsOf = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "·";

/**
 * The groups, as a crowd of their avatars.
 *
 * The point is how many communities are here, not which ones - so they overlap
 * in staggered rows, the way a group of people would, rather than sitting in a
 * grid inside a card. No figure is quoted: the pile itself says "a lot", and a
 * number that read as small on a quiet day would say the opposite.
 */
const GroupsMosaic = ({ apiLanguage, language }: GroupsMosaicProps) => {
  const { t } = useTranslate();

  const { data, isLoading } = useQuery(
    ["public-groups-mosaic", apiLanguage],
    () => fetchPublicGroups(apiLanguage, TILE_COUNT),
    { refetchOnWindowFocus: false },
  );

  const groups = data?.groups ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3 px-1">
        {ROW_LENGTHS.map((length, row) => (
          <div key={row} className="flex justify-center">
            {Array.from({ length }).map((_, index) => (
              <Skeleton
                key={index}
                className="size-14 shrink-0 rounded-full ring-4 ring-white not-first:-ml-4"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <PanelWord>{t("mantras.joinable_groups", "Practice spaces")}</PanelWord>;
  }

  // Deal the groups out across staggered rows.
  const rows: (typeof groups)[] = [];
  let cursor = 0;
  for (const length of ROW_LENGTHS) {
    if (cursor >= groups.length) break;
    rows.push(groups.slice(cursor, cursor + length));
    cursor += length;
  }

  return (
    // A little horizontal room so the outermost avatar's ring is not clipped.
    <div className="px-1">
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          // Centred rather than indented row by row: the stagger used to be a
          // left margin on alternate rows, which left a ragged edge and made the
          // whole cluster sit off to one side of its column.
          <div key={rowIndex} className="flex justify-center">
            {row.map((group) => {
              const title = getGroupTitleForLanguage(group.metadata, language);
              return (
                <Avatar
                  key={group.id}
                  data-testid="group-avatar"
                  title={title}
                  className="size-14 shrink-0 ring-4 ring-white not-first:-ml-4"
                >
                  {group.avatar_url && (
                    <AvatarImage src={group.avatar_url} alt="" />
                  )}
                  <AvatarFallback className="bg-white text-xs font-semibold text-[#102544]/70">
                    {initialsOf(title)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        {t(
          "home.groups_caption",
          "A lot of communities already practise here together.",
        )}
      </p>
    </div>
  );
};

export default GroupsMosaic;
