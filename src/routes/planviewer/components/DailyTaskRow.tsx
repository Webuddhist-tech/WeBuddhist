import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import { IoChevronForward, IoPause, IoPlay } from "react-icons/io5";
import type { SubTaskDTO, TaskDTO } from "../types.ts";
import { useDailyAudioPlay } from "../context/DailyAudioContext.tsx";
import { getTaskIcon } from "../utils/dayStripUtils.ts";
import SubtaskAudioPlay from "./SubtaskAudioPlay.tsx";

type DailyTaskRowProps = {
  task: TaskDTO;
  index: number;
  contentFontClass?: string;
};

function getFirstAudioSubtask(subtasks: SubTaskDTO[]): SubTaskDTO | undefined {
  return subtasks.find((subtask) => subtask.audio_url?.trim());
}

function SubTaskBody({
  subtask,
  contentFontClass = "",
  hideAudioButton = false,
}: {
  subtask: SubTaskDTO;
  contentFontClass?: string;
  hideAudioButton?: boolean;
}) {
  const type = subtask.content_type?.toUpperCase() ?? "TEXT";
  const audioUrl = subtask.audio_url?.trim();
  const hasText = Boolean(subtask.content?.trim());
  const hasImage =
    type === "IMAGE" && Boolean(subtask.image_url || subtask.content);

  if (!audioUrl && !hasText && !hasImage) return null;

  return (
    <div className="mt-3 space-y-2">
      {audioUrl && !hideAudioButton && (
        <SubtaskAudioPlay audioId={subtask.id} audioUrl={audioUrl} />
      )}

      {hasImage && (
        <img
          src={subtask.image_url ?? subtask.content ?? ""}
          alt=""
          className="max-h-72 rounded-xl object-contain"
        />
      )}

      {hasText && (
        <div
          className={`text-sm leading-relaxed text-stone-600 ${contentFontClass}`}
        >
          {(subtask.content ?? "").split("\n").map((line, i) => (
            <p key={subtask.id + String(i)} className={i > 0 ? "mt-2" : ""}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRowPlayButton({
  audioId,
  audioUrl,
  onBeforePlay,
}: {
  audioId: string;
  audioUrl: string;
  onBeforePlay: () => void;
}) {
  const { t } = useTranslate();
  const { audioRef, playing, handlePlayClick, onPlay, onPause, onEnded } =
    useDailyAudioPlay(audioId, audioUrl);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBeforePlay();
          handlePlayClick();
        }}
        className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white outline outline-1 outline-white transition hover:bg-stone-800"
        aria-label={
          playing
            ? t("plans.pause_audio", "Pause audio")
            : t("plans.play_audio_expand", "Play audio and expand section")
        }
      >
        {playing ? (
          <IoPause className="text-base" aria-hidden="true" />
        ) : (
          <IoPlay className="ml-0.5 text-base" aria-hidden="true" />
        )}
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
      >
        <track kind="captions" />
      </audio>
    </>
  );
}

const DailyTaskRow = ({
  task,
  index,
  contentFontClass = "",
}: DailyTaskRowProps) => {
  const [expanded, setExpanded] = useState(false);

  const sortedSubtasks = [...task.subtasks].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const firstAudioSubtask = getFirstAudioSubtask(sortedSubtasks);
  const firstAudioUrl = firstAudioSubtask?.audio_url?.trim();
  const hasAudio = Boolean(firstAudioUrl && firstAudioSubtask);
  const icon = getTaskIcon(index, task.title);
  const title = task.title?.trim() || `Section ${index + 1}`;

  return (
    <div>
      <div className="flex w-full items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:bg-stone-100/60"
          aria-expanded={expanded}
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-300"
            aria-hidden="true"
          />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
            {icon}
          </span>
          <span
            className={`min-w-0 flex-1 text-[15px] font-medium text-stone-900 ${contentFontClass}`}
          >
            {title}
          </span>
          {!hasAudio && (
            <IoChevronForward
              className={`shrink-0 text-lg text-stone-400 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              aria-hidden="true"
            />
          )}
        </button>

        {hasAudio && firstAudioSubtask && firstAudioUrl && (
          <TaskRowPlayButton
            audioId={firstAudioSubtask.id}
            audioUrl={firstAudioUrl}
            onBeforePlay={() => {
              if (!expanded) setExpanded(true);
            }}
          />
        )}
      </div>

      {expanded && sortedSubtasks.length > 0 && (
        <div className="pb-4 pl-16 pr-2">
          {sortedSubtasks.map((subtask) => (
            <SubTaskBody
              key={subtask.id}
              subtask={subtask}
              contentFontClass={contentFontClass}
              hideAudioButton={subtask.id === firstAudioSubtask?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DailyTaskRow;
