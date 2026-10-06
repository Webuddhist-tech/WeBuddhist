import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { resolveImageUrl } from "../../planviewer/utils/seriesUtils.ts";
import { safeExternalUrl } from "../../live-events/utils/eventUtils.ts";
import type { GroupPracticeDTO } from "../types.ts";

type GroupPracticesProps = {
  groupId: string;
  practices: GroupPracticeDTO[];
  /** The API's language, carried into the practice pages it links to. */
  apiLanguage: string;
  locale: string;
};

type PracticeCard = {
  key: string;
  kind: string;
  title: string;
  detail: string | null;
  imageUrl: string | null;
  /** Where the practice opens on the site; collections have no page yet. */
  to: string | null;
};

const CARD =
  "flex h-full items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-900/5 transition";

/**
 * What the group practises together: plan series, mantra accumulations and
 * recitation collections, each opening where the site already shows it.
 */
const GroupPractices = ({
  groupId,
  practices,
  apiLanguage,
  locale,
}: GroupPracticesProps) => {
  const { t } = useTranslate();
  const count = (value: number) => value.toLocaleString(locale);
  const withLanguage = (params: Record<string, string>) =>
    `/plans?${new URLSearchParams({ ...params, lang: apiLanguage })}`;

  const cards = practices.flatMap((practice): PracticeCard[] => {
    if (practice.type === "series" && practice.series) {
      const { series } = practice;
      return [
        {
          key: `series-${series.id}`,
          kind: t("group_page.practice_series"),
          title:
            series.metadata?.title?.trim() || t("group_page.untitled_practice"),
          detail: series.total_days
            ? t("group_page.days", { count: count(series.total_days) })
            : null,
          imageUrl: safeExternalUrl(resolveImageUrl(series.image)),
          to: withLanguage({ series: series.id, view: "list" }),
        },
      ];
    }
    if (practice.type === "accumulator" && practice.accumulator) {
      const { accumulator } = practice;
      return [
        {
          key: `accumulator-${accumulator.id}`,
          kind: t("group_page.practice_accumulator"),
          title: accumulator.title?.trim() || t("group_page.untitled_practice"),
          detail: [
            t("group_page.members_count", {
              count: count(accumulator.member_count),
            }),
            accumulator.target_count
              ? t("group_page.goal", {
                  count: count(accumulator.target_count),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          imageUrl: safeExternalUrl(resolveImageUrl(accumulator.image)),
          to: withLanguage({ group: groupId, accumulator: accumulator.id }),
        },
      ];
    }
    if (practice.type === "collection" && practice.collection) {
      const { collection } = practice;
      return [
        {
          key: `collection-${collection.id}`,
          kind: t("group_page.practice_collection"),
          title: collection.name?.trim() || t("group_page.untitled_practice"),
          detail: t("group_page.recitations", {
            count: count(collection.item_count),
          }),
          imageUrl: safeExternalUrl(collection.img_url),
          to: null,
        },
      ];
    }
    return [];
  });

  if (cards.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => {
        const body: ReactNode = (
          <>
            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-rose-50 to-[#eef2f7]">
              {card.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {card.kind}
              </p>
              <p className="mt-0.5 line-clamp-2 font-semibold leading-snug text-[#102544]">
                {card.title}
              </p>
              {card.detail && (
                <p className="mt-0.5 text-sm text-slate-500">{card.detail}</p>
              )}
            </div>
          </>
        );
        return (
          <li key={card.key}>
            {card.to ? (
              <Link
                to={card.to}
                className={`${CARD} hover:shadow-lg hover:shadow-slate-900/5 hover:ring-slate-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/50`}
              >
                {body}
              </Link>
            ) : (
              <div className={CARD}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default GroupPractices;
