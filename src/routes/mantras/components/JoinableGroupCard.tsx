import { useTranslate } from "@tolgee/react";
import type { AuthorGroupSummaryDTO } from "../types.ts";
import {
  getGroupDescriptionForLanguage,
  getGroupTitleForLanguage,
  getMemberInitials,
} from "../utils/groupUtils.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type JoinableGroupCardProps = {
  group: AuthorGroupSummaryDTO;
  language: PlanLanguageCode;
  onOpenApp: () => void;
  variant?: "carousel" | "list";
};

const JoinableGroupCard = ({
  group,
  language,
  onOpenApp,
  variant = "carousel",
}: JoinableGroupCardProps) => {
  const { t } = useTranslate();
  const title = getGroupTitleForLanguage(
    group.metadata,
    language,
    t("group_page.untitled"),
  );
  const description = getGroupDescriptionForLanguage(group.metadata, language);
  const contentFontClass = getLanguageClass(
    language === "BO" ? "bo-IN" : language === "ZH" ? "zh-Hans-CN" : "en",
  );

  const handleClick = () => {
    onOpenApp();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  const ariaLabel = t(
    "mantras.open_app_for_group",
    "Download the app to join {title}",
    { title },
  );

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={ariaLabel}
        className="group flex w-full items-start gap-4 rounded-2xl bg-white p-4 text-left shadow-sm shadow-slate-900/5 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/40"
      >
        <Avatar className="size-14 border border-slate-100">
          {group.avatar_url ? (
            <AvatarImage src={group.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="bg-slate-100 text-[#102544]">
            {getMemberInitials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3
            className={`text-lg font-semibold text-slate-900 ${contentFontClass}`}
          >
            {title}
          </h3>
          {description && (
            <p
              className={`line-clamp-2 text-sm text-slate-500 ${contentFontClass}`}
            >
              {description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>
              {group.joiner_count.toLocaleString()}{" "}
              {t("mantras.members_label", "members")}
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={ariaLabel}
      className="group flex w-66 shrink-0 flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/40"
    >
      <div className="relative h-28 w-full overflow-hidden bg-linear-to-br from-slate-700 to-[#102544]">
        {group.avatar_url ? (
          <img
            src={group.banner_url}
            alt=""
            className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <Avatar className="size-12 border-2 border-white/80 shadow-sm">
            {group.avatar_url ? (
              <AvatarImage
                src={group.avatar_url}
                alt=""
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-white text-[#102544]">
              {getMemberInitials(title)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3
          className={`line-clamp-2 text-base font-semibold text-slate-900 ${contentFontClass}`}
        >
          {title}
        </h3>
        {description && (
          <p
            className={`line-clamp-2 text-sm text-slate-500 ${contentFontClass}`}
          >
            {description}
          </p>
        )}
        <p className="mt-auto pt-2 text-xs font-medium text-slate-400">
          {group.joiner_count.toLocaleString()}{" "}
          {t("mantras.members_label", "members")}
        </p>
      </div>
    </button>
  );
};

export default JoinableGroupCard;
