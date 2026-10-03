import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { IoRadioOutline } from "react-icons/io5";
import type { EventDTO } from "../../live-events/types.ts";
import {
  eventImageUrl,
  eventPhase,
  eventTitle,
  formatEventWindow,
} from "../../live-events/utils/eventUtils.ts";
import LivePill from "../../live-events/components/LivePill.tsx";
import Highlighted from "./Highlighted.tsx";
import {
  NoResults,
  PREVIEW_COUNT,
  RESULT_CARD,
  ResultSkeleton,
  Thumb,
} from "./ResultParts.tsx";
import type { CategoryResults } from "./useSearchResults.ts";

type EventResultsProps = {
  results: CategoryResults<EventDTO>;
  query: string;
  language: string;
  locale: string;
  preview?: boolean;
};

/** Live and upcoming events, live ones first. */
const EventResults = ({
  results,
  query,
  language,
  locale,
  preview,
}: EventResultsProps) => {
  const { t } = useTranslate();
  if (results.isLoading) return <ResultSkeleton />;
  if (results.items.length === 0) return <NoResults />;
  const items = preview ? results.items.slice(0, PREVIEW_COUNT) : results.items;

  return (
    <div className="space-y-3">
      {items.map((event) => {
        const title =
          eventTitle(event, language) || t("live_events.untitled", "Untitled");
        return (
          <Link
            key={event.id}
            to={`/live/${event.id}`}
            className={`${RESULT_CARD} flex gap-4`}
          >
            <Thumb
              src={eventImageUrl(event, "thumbnail")}
              className="h-20 w-28 sm:h-24 sm:w-36"
              fallback={<IoRadioOutline className="size-6 text-faded-grey" />}
            />
            <div className="min-w-0">
              {eventPhase(event) === "live" && (
                <LivePill className="mb-2 px-2 py-0.5" />
              )}
              <p className="font-semibold text-primary group-hover:underline">
                <Highlighted text={title} query={query} />
              </p>
              <p className="mt-1 text-sm text-faded-grey">
                {[event.group_name, formatEventWindow(event, locale)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default EventResults;
