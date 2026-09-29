import { useTranslate } from "@tolgee/react";
import type { EventDTO } from "../types.ts";
import {
  preferredVideo,
  safeExternalUrl,
  youtubeEmbedUrl,
} from "../utils/eventUtils.ts";

type EventVideoProps = {
  event: EventDTO;
  language: string;
  /** Autoplays muted while the event is running, as a stream page would. */
  isLive: boolean;
};

/**
 * The event's stream.
 *
 * Organizers add one YouTube entry per language for the same puja, so the entry
 * is picked by language rather than by position. A non-YouTube URL is offered as
 * a link instead of being forced into an iframe that would not load, provided
 * its scheme is one a browser can safely follow.
 */
const EventVideo = ({ event, language, isLive }: EventVideoProps) => {
  const { t } = useTranslate();
  const video = preferredVideo(event, language);
  if (!video) return null;

  const embedUrl = youtubeEmbedUrl(video.url);

  if (!embedUrl) {
    // The fallback hands the organizer's URL straight to an anchor, so it has
    // to clear the same scheme check the embed path gets for free.
    const streamUrl = safeExternalUrl(video.url);
    if (!streamUrl) return null;

    return (
      <a
        href={streamUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-full bg-[#102544] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1b3a67]"
      >
        {video.label?.trim() || t("live_events.watch_stream")}
      </a>
    );
  }

  return (
    <figure className="overflow-hidden rounded-3xl bg-slate-900 shadow-lg shadow-slate-900/10">
      <div className="relative aspect-video">
        <iframe
          // `mute=1` with autoplay: browsers block sound that starts itself, and
          // a blocked autoplay leaves a dead frame rather than a paused video.
          src={`${embedUrl}?rel=0${isLive ? "&autoplay=1&mute=1" : ""}`}
          title={video.label?.trim() || t("live_events.watch_stream")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      {video.label?.trim() && (
        <figcaption className="px-5 py-3 text-sm text-white/70">
          {video.label}
        </figcaption>
      )}
    </figure>
  );
};

export default EventVideo;
