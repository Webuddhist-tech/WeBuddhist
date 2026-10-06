import { IoPause, IoPlay } from "react-icons/io5";
import { useTranslate } from "@tolgee/react";
import { useDailyAudioPlay } from "../context/DailyAudioContext.tsx";

type SubtaskAudioPlayProps = {
  audioId: string;
  audioUrl: string;
  label?: string;
  compact?: boolean;
};

const SubtaskAudioPlay = ({
  audioId,
  audioUrl,
  label,
  compact = false,
}: SubtaskAudioPlayProps) => {
  const { t } = useTranslate();
  const { audioRef, playing, handlePlayClick, onPlay, onPause, onEnded } =
    useDailyAudioPlay(audioId, audioUrl);

  const sizeClass = compact ? "h-6 w-6" : "h-10 w-10";
  const iconClass = compact ? "text-base" : "text-lg";

  return (
    <div className={compact ? undefined : "mt-3 flex items-center gap-3"}>
      <button
        type="button"
        onClick={handlePlayClick}
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-800`}
        aria-label={
          playing
            ? t("plans.pause_audio", "Pause audio")
            : (label ?? t("plans.play_audio", "Play audio"))
        }
      >
        {playing ? (
          <IoPause className={iconClass} aria-hidden="true" />
        ) : (
          <IoPlay className={`ml-0.5 ${iconClass}`} aria-hidden="true" />
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
    </div>
  );
};

export default SubtaskAudioPlay;
