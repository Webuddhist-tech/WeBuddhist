import { useState } from "react";
import { useTranslate } from "@tolgee/react";
import { Link } from "react-router-dom";
import type { EventDTO } from "../types.ts";
import {
  eventDescriptionExcerpt,
  eventImageUrl,
  eventPhase,
  eventTitle,
  eventTitleLanguage,
  formatEventWindow,
  locationLabel,
} from "../utils/eventUtils.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import LivePill from "./LivePill.tsx";

type LiveEventCardProps = {
  event: EventDTO;
  language: string;
  locale: string;
};

/**
 * One event in the list.
 *
 * The whole card is a single link rather than a card with a link inside it, so
 * the hit area matches what the hover state promises and there is one tab stop
 * per event instead of three.
 */
const LiveEventCard = ({ event, language, locale }: LiveEventCardProps) => {
  const { t } = useTranslate();
  const title = eventTitle(event, language) || t("live_events.untitled");
  const excerpt = eventDescriptionExcerpt(event, language);
  const phase = eventPhase(event);
  const imageUrl = eventImageUrl(event);
  // The links are presigned and expire; a page left open past that shows the
  // wash rather than a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const where = locationLabel(event);
  const titleFontClass = getLanguageClass(eventTitleLanguage(event, language));

  return (
    <Link
      to={`/live/${event.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#102544]/50"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {imageUrl && imageUrl !== failedUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            onError={() => setFailedUrl(imageUrl)}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          // A warm wash rather than flat grey, so an event without artwork
          // still carries its weight in the grid.
          <div className="h-full w-full bg-gradient-to-br from-amber-100 via-rose-50 to-[#eef2f7]" />
        )}

        {phase === "live" && (
          <div className="absolute left-4 top-4">
            <LivePill />
          </div>
        )}
        {phase === "past" && (
          <div className="absolute left-4 top-4 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur">
            {t("live_events.ended")}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-5 sm:p-6">
        {event.group_name && (
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {event.group_avatar_url && (
              <img
                src={event.group_avatar_url}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            )}
            <span className="truncate">{event.group_name}</span>
          </p>
        )}

        <h3
          className={`text-balance text-lg font-semibold leading-snug tracking-tight text-[#102544] ${titleFontClass}`}
        >
          {title}
        </h3>

        {excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
            {excerpt}
          </p>
        )}

        <p className="text-sm leading-snug text-slate-600">
          {formatEventWindow(event, locale)}
        </p>

        {where && (
          <p className="truncate text-sm text-slate-500" title={where}>
            {where}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-slate-500">
          {typeof event.participant_count === "number" &&
            event.participant_count > 0 && (
              <span>
                {t("live_events.participants", {
                  count: event.participant_count,
                })}
              </span>
            )}
          {(event.youtube?.length ?? 0) > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              {t("live_events.has_video")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default LiveEventCard;
