import { useTranslate } from "@tolgee/react";
import { useLiveViewerCount } from "../hooks/useLiveViewerCount.ts";

type LiveViewerCountProps = {
  eventId: string;
  /** Off while the event is not running - an idle socket tells nobody anything. */
  enabled?: boolean;
};

/**
 * How many people are following this event's recitation right now.
 *
 * Following is limited to members of the event's group, so a signed-out or
 * non-member reader is told what stands between them and the number rather than
 * being shown a silent blank.
 */
const LiveViewerCount = ({ eventId, enabled = true }: LiveViewerCountProps) => {
  const { t } = useTranslate();
  const { count, status, detail } = useLiveViewerCount(eventId, enabled);

  if (!enabled) return null;

  if (status === "connected" && count !== null) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-600/20"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        {count === 1
          ? t("live_events.watching_one")
          : t("live_events.watching_other", { count })}
        <span className="font-normal text-emerald-700/70">
          {t("live_events.including_you")}
        </span>
      </div>
    );
  }

  const message = (() => {
    if (status === "signed-out") return t("live_events.sign_in_to_see");
    // The server says why it refused - most often that following is for group
    // members - and that is more useful than any wording invented here.
    if (status === "refused")
      return detail || t("live_events.count_unavailable");
    if (status === "reconnecting") return t("live_events.reconnecting");
    return t("live_events.connecting");
  })();

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden />
      {message}
    </div>
  );
};

export default LiveViewerCount;
