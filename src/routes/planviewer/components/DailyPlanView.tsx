import { useMemo } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import {
  fetchPlanDaily,
  fetchPlanDayCompletionStatus,
} from "../api/plansApi.ts";
import { resolveImageUrl } from "../utils/seriesUtils.ts";
import { buildDayStrip } from "../utils/dayStripUtils.ts";
import {
  getEarlyReturn,
  getLanguageClass,
} from "../../../utils/helperFunctions.tsx";
import DaySelectorStrip from "./DaySelectorStrip.tsx";
import DailyTaskRow from "./DailyTaskRow.tsx";
import SubtaskAudioPlay from "./SubtaskAudioPlay.tsx";
import { DailyAudioProvider } from "../context/DailyAudioContext.tsx";
import {
  getPrimaryDayAudioId,
  PLAN_DAILY_AUDIO_ID,
} from "../utils/planAudioUtils.ts";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/constants.ts";

type DailyPlanViewProps = {
  planId: string;
  apiLanguage: string;
  selectedDate?: string | null;
  isAuthenticated: boolean;
  onBack: () => void;
  onDateChange: (date: string | null) => void;
};

const DailyPlanView = ({
  planId,
  apiLanguage,
  selectedDate,
  isAuthenticated,
  onBack,
  onDateChange,
}: DailyPlanViewProps) => {
  const { t } = useTranslate();
  const navigate = useNavigate();

  const {
    data: daily,
    isLoading: isDailyLoading,
    error: dailyError,
  } = useQuery(
    ["plan-daily", planId, apiLanguage, selectedDate],
    () => fetchPlanDaily(planId, apiLanguage, selectedDate ?? undefined),
    {
      enabled: Boolean(planId),
      refetchOnWindowFocus: false,
    },
  );

  const { data: dayCompletion } = useQuery(
    ["plan-day-completion", planId],
    () => fetchPlanDayCompletionStatus(planId),
    {
      enabled: isAuthenticated && Boolean(planId),
      refetchOnWindowFocus: false,
    },
  );

  const dayStrip = useMemo(
    () => (daily ? buildDayStrip(daily.start_date, daily.total_days) : []),
    [daily],
  );

  const completedDayNumbers = useMemo(() => {
    const completed = new Set<number>();
    dayCompletion?.days.forEach((day) => {
      if (day.is_completed) completed.add(day.day_number);
    });
    return completed;
  }, [dayCompletion]);

  const earlyReturn = getEarlyReturn({
    isLoading: isDailyLoading,
    error: dailyError,
    t,
  });
  if (earlyReturn) return earlyReturn;

  if (!daily) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-stone-500">
        {t(
          "plans.no_daily_content",
          "No daily content available for this series.",
        )}
      </div>
    );
  }

  const imageUrl = resolveImageUrl(daily.image);
  const sortedTasks = [...daily.tasks].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const contentFontClass = getLanguageClass(apiLanguage);
  const primaryAudioId = getPrimaryDayAudioId(daily);
  const dayKey = `${planId}-${daily.date}`;

  const handlePracticeNow = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    window.open(isApple ? APP_STORE_URL : PLAY_STORE_URL, "_blank");
  };

  return (
    <DailyAudioProvider primaryAudioId={primaryAudioId} dayKey={dayKey}>
      <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col bg-[#FAF9F6] text-stone-900">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-2">
          <div className="relative mb-4 flex items-center justify-center py-2">
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full text-stone-900 hover:bg-stone-200/60"
              aria-label={t("plans.back_to_series", "Back to series")}
            >
              <IoArrowBack className="text-xl" />
            </button>
            <h1
              className={`max-w-[72%] truncate text-base font-bold text-stone-900 ${contentFontClass}`}
            >
              {daily.plan_title}
            </h1>
          </div>

          {imageUrl && (
            <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
              <img
                src={imageUrl}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          )}

          <DaySelectorStrip
            days={dayStrip}
            activeDayNumber={daily.day_number}
            completedDayNumbers={completedDayNumbers}
            onSelectDay={(date) => onDateChange(date)}
          />

          <div className="mb-2 mt-6 flex items-baseline justify-between gap-3">
            <p className="text-lg font-bold text-stone-900">
              {t("plans.day_label", "Day")} {daily.day_number}{" "}
              {t("plans.of", "of")} {daily.total_days}
            </p>
          </div>

          {daily.audio_url && (
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <SubtaskAudioPlay
                audioId={PLAN_DAILY_AUDIO_ID}
                audioUrl={daily.audio_url}
                label={t("plans.play_daily_audio", "Play daily audio")}
              />
            </div>
          )}

          <div className="flex-1">
            {sortedTasks.length === 0 ? (
              <p className="py-6 text-sm text-stone-500">
                {t("plans.no_tasks_today", "No tasks for this day.")}
              </p>
            ) : (
              sortedTasks.map((task, index) => (
                <DailyTaskRow
                  key={task.id}
                  task={task}
                  index={index}
                  contentFontClass={contentFontClass}
                />
              ))
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-[#FAF9F6]/95 px-4 py-4 backdrop-blur-md">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={handlePracticeNow}
              className="w-full rounded-full bg-stone-900 py-3.5 text-[15px] font-semibold text-white transition hover:bg-stone-800"
            >
              {t("plans.practice_now", "Practice now")}
            </button>
          </div>
        </div>
      </div>
    </DailyAudioProvider>
  );
};

export default DailyPlanView;
