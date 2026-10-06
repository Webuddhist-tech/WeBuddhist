import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import { IoChevronForward, IoPause, IoPlay } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import type { SubTaskDTO, SubTaskReferenceDTO, TaskDTO } from "../types.ts";
import {
  safeExternalUrl,
  youtubeVideoId,
} from "../../live-events/utils/eventUtils.ts";
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

const subtaskMarkdownComponents: Components = {
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
  h1: ({ children }) => (
    <h4 className="mt-3 text-base font-semibold text-stone-900 first:mt-0">
      {children}
    </h4>
  ),
  h2: ({ children }) => (
    <h4 className="mt-3 text-[15px] font-semibold text-stone-900 first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mt-3 font-semibold text-stone-900 first:mt-0">{children}</h5>
  ),
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-stone-800">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-2 border-l-2 border-stone-300 pl-3 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => {
    const safeHref = safeExternalUrl(href);
    if (!safeHref) return <span>{children}</span>;
    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-stone-900"
      >
        {children}
      </a>
    );
  },
  // Images belong in IMAGE subtasks; don't let inline markdown pull in arbitrary sources.
  img: () => null,
};

function SubTaskImage({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="max-h-96 w-full rounded-xl object-contain"
    />
  );
}

function SubTaskVideo({ url }: { url: string }) {
  const videoId = youtubeVideoId(url);
  if (videoId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-stone-900">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title="YouTube video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video src={url} controls preload="metadata" className="w-full rounded-xl">
      <track kind="captions" />
    </video>
  );
}

function SubTaskReferenceCard({
  reference,
}: {
  reference: SubTaskReferenceDTO;
}) {
  const imageUrl = safeExternalUrl(reference.image_url);
  if (!reference.title && !imageUrl) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0">
        {reference.title && (
          <p className="truncate text-sm font-medium text-stone-900">
            {reference.title}
          </p>
        )}
        {reference.subtitle && (
          <p className="truncate text-xs text-stone-500">
            {reference.subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders one subtask according to its own content_type, so a task can mix
 * images, text, source references, video, audio and linked content.
 */
function renderSubTaskContent({
  subtask,
  contentFontClass,
}: {
  subtask: SubTaskDTO;
  contentFontClass: string;
}) {
  const type = subtask.content_type?.toUpperCase() ?? "TEXT";
  const content = subtask.content?.trim() ?? "";
  const textClass = `text-sm leading-relaxed text-stone-600 ${contentFontClass}`;

  switch (type) {
    case "IMAGE": {
      // `content` is the presigned URL; `image_url` may be a bare storage key.
      const src =
        safeExternalUrl(content) ?? safeExternalUrl(subtask.image_url);
      return src ? <SubTaskImage src={src} /> : null;
    }
    case "VIDEO": {
      const url = safeExternalUrl(content);
      return url ? <SubTaskVideo url={url} /> : null;
    }
    case "AUDIO": {
      const url = safeExternalUrl(content);
      // Narration from audio_url already gets its own play button.
      if (!url || url === subtask.audio_url?.trim()) return null;
      return (
        <SubtaskAudioPlay audioId={`${subtask.id}-content`} audioUrl={url} />
      );
    }
    case "SOURCE_REFERENCE":
      if (!content) return null;
      return (
        <div className={textClass}>
          {content.split("\n").map((line, i) => (
            <p key={subtask.id + String(i)} className={i > 0 ? "mt-2" : ""}>
              {line}
            </p>
          ))}
        </div>
      );
    case "TEXT":
      if (!content) return null;
      return (
        <div className={`min-w-0 ${textClass}`}>
          <ReactMarkdown
            remarkPlugins={[remarkBreaks]}
            components={subtaskMarkdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    default:
      // GROUP_ACCUMULATION, GROUP_COLLECTION, EVENT, POST and future types.
      if (subtask.reference) {
        return <SubTaskReferenceCard reference={subtask.reference} />;
      }
      return content && !safeExternalUrl(content) ? (
        <p className={textClass}>{content}</p>
      ) : null;
  }
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
  const audioUrl = subtask.audio_url?.trim();
  const body = renderSubTaskContent({ subtask, contentFontClass });
  const showAudio = Boolean(audioUrl) && !hideAudioButton;

  if (!showAudio && !body) return null;

  return (
    <div className="mt-3 space-y-2">
      {showAudio && audioUrl && (
        <SubtaskAudioPlay audioId={subtask.id} audioUrl={audioUrl} />
      )}
      {body}
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
