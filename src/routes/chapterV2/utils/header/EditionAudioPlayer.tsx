import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";
import { IoChevronDown, IoPause, IoPlay } from "react-icons/io5";
import { CheckIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  fetchEditionRecordings,
  recordingAudioUrl,
  type LibraryRecording,
} from "@/services/library";

type EditionAudioPlayerProps = {
  editionId?: string;
};

const pickLocalized = (map?: Record<string, string> | null) => {
  if (!map) return null;
  return map.en || map.bo || Object.values(map)[0] || null;
};

const formatDuration = (durationMs?: number | null) => {
  if (durationMs == null || durationMs < 0) return null;
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const recordingLabel = (recording: LibraryRecording, index: number) => {
  const title = pickLocalized(recording.title);
  if (title) return title;

  const narrator = recording.contributions?.find(
    (contribution) => contribution.role === "narrator",
  );
  const narratorName = pickLocalized(narrator?.name);
  if (narratorName) return narratorName;

  return `Recording ${index + 1}`;
};

const EditionAudioPlayer = ({ editionId }: EditionAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const {
    data: recordings,
    isLoading,
    isError,
  } = useQuery(
    ["editionRecordings", editionId],
    () => fetchEditionRecordings(editionId as string),
    {
      enabled: !!editionId,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const activeId =
    selectedId && recordings?.some((recording) => recording.id === selectedId)
      ? selectedId
      : recordings?.[0]?.id;

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [activeId]);

  if (!editionId || isLoading || isError || !recordings?.length || !activeId) {
    return null;
  }

  const handlePlayClick = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  const handleSelectRecording = (recordingId: string) => {
    if (recordingId === activeId) return;
    audioRef.current?.pause();
    setPlaying(false);
    setSelectedId(recordingId);
  };

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        onClick={handlePlayClick}
        aria-label={playing ? "Pause" : "Play"}
        className="cursor-pointer"
      >
        {playing ? (
          <IoPause aria-hidden="true" />
        ) : (
          <IoPlay className="ml-0.5" aria-hidden="true" />
        )}
      </Button>
      {recordings.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent"
              aria-label="Choose recording"
            >
              <IoChevronDown aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {recordings.map((recording, index) => {
              const duration = formatDuration(recording.duration_ms);
              const isSelected = recording.id === activeId;
              return (
                <DropdownMenuItem
                  key={recording.id}
                  onClick={() => handleSelectRecording(recording.id)}
                >
                  {isSelected && <CheckIcon className="size-4" />}
                  <span>{recordingLabel(recording, index)}</span>
                  {duration && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {duration}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <audio
        ref={audioRef}
        src={recordingAudioUrl(activeId)}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        <track kind="captions" />
      </audio>
    </div>
  );
};

export default EditionAudioPlayer;
