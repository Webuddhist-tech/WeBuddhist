import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoArrowBack } from "react-icons/io5";
import {
  fetchGroupAccumulatorDetail,
  fetchGroupAccumulatorMembersPage,
} from "../api/accumulatorApi.ts";
import { useInfiniteMembers } from "../hooks/useInfiniteMembers.ts";
import { InfiniteMemberList } from "./InfiniteMemberList.tsx";
import { getEarlyReturn } from "../../../utils/helperFunctions.tsx";
import { resolveImageUrl } from "../../planviewer/utils/seriesUtils.ts";

type GroupAccumulatorDetailViewProps = {
  groupAccumulatorId: string;
  onBack: () => void;
};

const GroupAccumulatorDetailView = ({
  groupAccumulatorId,
  onBack,
}: GroupAccumulatorDetailViewProps) => {
  const { t } = useTranslate();

  const {
    data: accumulator,
    isLoading: isAccumulatorLoading,
    error: accumulatorError,
  } = useQuery(
    ["group-accumulator-detail", groupAccumulatorId],
    () => fetchGroupAccumulatorDetail(groupAccumulatorId),
    { refetchOnWindowFocus: false },
  );

  const {
    members,
    total: membersTotal,
    isLoading: isMembersLoading,
    isFetchingNextPage,
    sentinelRef,
  } = useInfiniteMembers({
    queryKey: ["group-accumulator-members", groupAccumulatorId],
    fetchPage: (skip, limit) =>
      fetchGroupAccumulatorMembersPage(groupAccumulatorId, skip, limit),
    enabled: Boolean(groupAccumulatorId),
  });

  const earlyReturn = getEarlyReturn({
    isLoading: isAccumulatorLoading,
    error: accumulatorError,
    t,
  });
  if (earlyReturn) return earlyReturn;
  if (!accumulator) return null;

  const imageUrl = resolveImageUrl(accumulator.image);
  const title =
    accumulator.title?.trim() ||
    t("mantras.untitled_practice", "Untitled practice");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-amber-800 transition hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={t("mantras.back_to_group", "Back to practice space")}
      >
        <IoArrowBack className="size-4" aria-hidden="true" />
        {t("mantras.back", "Back")}
      </button>

      <header className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-amber-50">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl text-amber-700/40">
                ☸
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">
              {accumulator.member_count.toLocaleString()}{" "}
              {t("mantras.members_label", "members")}
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-gray-600">
              <span>
                {t("mantras.total_count", "Total")}:{" "}
                {accumulator.total_count.toLocaleString()}
              </span>
              {accumulator.target_count ? (
                <span>
                  {t("mantras.target_count", "Target")}:{" "}
                  {accumulator.target_count.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("mantras.practice_members", "Practice Members")}
        </h2>
        <InfiniteMemberList
          members={members.map((member) => ({
            fullname: member.fullname,
            username: member.username,
            avatarUrl: member.avatar_url,
            subtitle: member.total_count
              ? t("mantras.member_count_subtitle", "{count} recitations", {
                  count: member.total_count.toLocaleString(),
                })
              : null,
          }))}
          total={membersTotal}
          isLoading={isMembersLoading}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={sentinelRef}
          emptyMessage={t(
            "mantras.no_practice_members_yet",
            "No one has joined this practice yet.",
          )}
        />
      </section>
    </div>
  );
};

export default GroupAccumulatorDetailView;
