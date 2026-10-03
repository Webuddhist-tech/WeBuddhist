import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { IoRadioOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";
import { fetchFeaturedEvents } from "../../live-events/api/eventsApi.ts";
import type { EventDTO } from "../../live-events/types.ts";
import {
  eventImageUrl,
  eventPhase,
  eventTitle,
  eventTitleLanguage,
  formatEventWindow,
  sortByPhaseThenTime,
} from "../../live-events/utils/eventUtils.ts";
import LivePill from "../../live-events/components/LivePill.tsx";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import HomeSection, { CardRowSkeleton } from "../components/HomeSection.tsx";

type LiveSectionProps = {
  apiLanguage: string;
  locale: string;
};

/**
 * Featured live events - whatever is on now, then what is coming up -
 * three to a row. Hidden entirely when nothing is live or scheduled.
 */
const LiveSection = ({ apiLanguage, locale }: LiveSectionProps) => {
  const { t } = useTranslate();
  // Same key as the live page, so the two share a request.
  const { data, isLoading } = useQuery(
    ["featured-events", apiLanguage],
    () => fetchFeaturedEvents(apiLanguage),
    { refetchOnWindowFocus: false },
  );
  const events = sortByPhaseThenTime(data ?? [])
    .filter((event) => eventPhase(event) !== "past")
    .slice(0, 3);

  if (!isLoading && events.length === 0) return null;

  return (
    <HomeSection
      icon={IoRadioOutline}
      label={t("header.live", "Live")}
      title={t("home.live_title", "Practice together, as it happens")}
      seeAllTo="/live"
    >
      {isLoading ? (
        <CardRowSkeleton />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              apiLanguage={apiLanguage}
              locale={locale}
            />
          ))}
        </div>
      )}
    </HomeSection>
  );
};

const EventCard = ({
  event,
  apiLanguage,
  locale,
}: { event: EventDTO } & LiveSectionProps) => {
  const { t } = useTranslate();
  const imageUrl = eventImageUrl(event);
  // Presigned links expire; show the wash instead of a broken image.
  const [failed, setFailed] = useState(false);
  const isLive = eventPhase(event) === "live";

  return (
    <Link to={`/live/${event.id}`} className="group block min-w-0">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-[#102544] to-[#2a3f63]">
        {imageUrl && !failed && (
          <img
            src={imageUrl}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        {isLive && <LivePill className="absolute left-3 top-3" />}
      </div>
      <p
        className={cn(
          "mt-3 line-clamp-2 font-semibold leading-snug text-primary group-hover:underline",
          getLanguageClass(eventTitleLanguage(event, apiLanguage)),
        )}
      >
        {eventTitle(event, apiLanguage) || t("live_events.untitled")}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-faded-grey">
        {event.group_avatar_url && (
          <img
            src={event.group_avatar_url}
            alt=""
            className="size-5 rounded-full object-cover"
          />
        )}
        <span className="truncate">
          {[event.group_name, formatEventWindow(event, locale)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
    </Link>
  );
};

export default LiveSection;
