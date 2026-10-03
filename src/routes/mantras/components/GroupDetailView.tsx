import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoArrowBack } from "react-icons/io5";
import {
  fetchGroupAccumulators,
  fetchGroupMembersPage,
  fetchPublicGroupDetail,
} from "../api/accumulatorApi.ts";
import { useInfiniteMembers } from "../hooks/useInfiniteMembers.ts";
import { InfiniteMemberList } from "./InfiniteMemberList.tsx";
import {
  getGroupDescriptionForLanguage,
  getGroupTitleForLanguage,
} from "../utils/groupUtils.ts";
import {
  getEarlyReturn,
  getLanguageClass,
} from "../../../utils/helperFunctions.tsx";
import { resolveImageUrl } from "../../planviewer/utils/seriesUtils.ts";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberInitials } from "../utils/groupUtils.ts";

type GroupDetailViewProps = {
  groupId: string;
  apiLanguage: string;
  language: PlanLanguageCode;
  onBack: () => void;
  onSelectAccumulator: (accumulatorId: string) => void;
};

const GroupDetailView = ({
  groupId,
  apiLanguage,
  language,
  onBack,
  onSelectAccumulator,
}: GroupDetailViewProps) => {
  const { t } = useTranslate();

  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
  } = useQuery(
    ["public-group-detail", groupId, apiLanguage],
    () => fetchPublicGroupDetail(groupId, apiLanguage),
    { refetchOnWindowFocus: false },
  );

  const {
    data: accumulatorsData,
    isLoading: isAccumulatorsLoading,
    error: accumulatorsError,
  } = useQuery(
    ["group-accumulators", groupId],
    () => fetchGroupAccumulators(groupId),
    { refetchOnWindowFocus: false },
  );

  const {
    members,
    total: membersTotal,
    isLoading: isMembersLoading,
    isFetchingNextPage,
    sentinelRef,
  } = useInfiniteMembers({
    queryKey: ["group-members", groupId],
    fetchPage: (skip, limit) => fetchGroupMembersPage(groupId, skip, limit),
    enabled: Boolean(groupId),
  });

  const isLoading = isGroupLoading || isAccumulatorsLoading;
  const error = groupError || accumulatorsError;
  const earlyReturn = getEarlyReturn({ isLoading, error, t });
  if (earlyReturn) return earlyReturn;
  if (!group) return null;

  const title = getGroupTitleForLanguage(
    group.metadata,
    language,
    t("group_page.untitled"),
  );
  const description = getGroupDescriptionForLanguage(group.metadata, language);
  const contentFontClass = getLanguageClass(
    language === "BO" ? "bo-IN" : language === "ZH" ? "zh-Hans-CN" : "en",
  );
  const bannerUrl = group.banner_url?.trim() || "";
  const accumulators = accumulatorsData?.accumulators ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-amber-800 transition hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={t("mantras.back_to_home", "Back to home")}
      >
        <IoArrowBack className="size-4" aria-hidden="true" />
        {t("mantras.back", "Back")}
      </button>

      <header className="space-y-4">
        {bannerUrl ? (
          <div className="aspect-[3/1] overflow-hidden rounded-2xl bg-amber-50">
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border border-amber-100">
            {group.avatar_url ? (
              <AvatarImage src={group.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="bg-amber-50 text-lg text-amber-800">
              {getMemberInitials(title)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <h1
              className={`text-2xl font-semibold text-gray-900 ${contentFontClass}`}
            >
              {title}
            </h1>
            {description && (
              <p className={`text-sm text-gray-600 ${contentFontClass}`}>
                {description}
              </p>
            )}
            <p className="text-sm text-gray-500">
              {group.joiner_count.toLocaleString()}{" "}
              {t("mantras.members_label", "members")}
            </p>
          </div>
        </div>
      </header>

      {accumulators.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("mantras.group_practices", "Practices")}
          </h2>
          <div className="grid gap-3">
            {accumulators.map((accumulator) => {
              const imageUrl = resolveImageUrl(accumulator.image);
              const practiceTitle =
                accumulator.title?.trim() ||
                t("mantras.untitled_practice", "Untitled practice");

              return (
                <button
                  key={accumulator.id}
                  type="button"
                  onClick={() => onSelectAccumulator(accumulator.id)}
                  className="flex items-center gap-4 rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label={practiceTitle}
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-amber-50">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-amber-700/40">
                        ☸
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{practiceTitle}</p>
                    <p className="text-sm text-gray-500">
                      {accumulator.member_count.toLocaleString()}{" "}
                      {t("mantras.members_label", "members")}
                      {accumulator.target_count
                        ? ` · ${t("mantras.target_count", "Target")}: ${accumulator.target_count.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("mantras.group_members", "Members")}
        </h2>
        <InfiniteMemberList
          members={members.map((member) => ({
            fullname: member.fullname,
            username: member.username,
            avatarUrl: member.avatar_url,
          }))}
          total={membersTotal}
          isLoading={isMembersLoading}
          isFetchingNextPage={isFetchingNextPage}
          sentinelRef={sentinelRef}
          emptyMessage={t(
            "mantras.no_members_yet",
            "No members have joined this practice space yet.",
          )}
        />
      </section>
    </div>
  );
};

export default GroupDetailView;
