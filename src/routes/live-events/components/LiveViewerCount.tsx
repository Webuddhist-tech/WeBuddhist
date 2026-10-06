import { useTranslate } from "@tolgee/react";
import type { LiveViewerCount as LiveViewerCountState } from "../hooks/useLiveViewerCount.ts";

type LiveViewerCountProps = {
  /**
   * The event's live socket. The page holds it, not this component, because
   * the recitation text follows the same socket.
   */
  live: LiveViewerCountState;
  /** Off while the event is not running - an idle socket tells nobody anything. */
  enabled?: boolean;
  /** `dark` for the live recitation page, which sits on a black stage. */
  tone?: "light" | "dark";
};

const TONES = {
  light: {
    connected:
      "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20 [&_.aside]:text-emerald-700/70",
    idle: "bg-slate-100 text-slate-600",
    idleDot: "bg-slate-400",
  },
  dark: {
    connected:
      "bg-[#1f3a24] text-[#7fd598] [&_.aside]:text-[#7fd598]/60 ring-1 ring-[#7fd598]/15",
    idle: "bg-[#1c1c1e] text-[#8e8e93] ring-1 ring-white/5",
    idleDot: "bg-[#8e8e93]",
  },
};

/**
 * How many people are following this event's recitation right now, signed in
 * or not. A socket the server turns away says why rather than leaving a blank.
 */
const LiveViewerCount = ({
  live,
  enabled = true,
  tone = "light",
}: LiveViewerCountProps) => {
  const { t } = useTranslate();
  const { count, status, detail } = live;
  const colors = TONES[tone];

  if (!enabled) return null;

  if (status === "connected" && count !== null) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${colors.connected}`}
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
        <span className="aside font-normal">
          {t("live_events.including_you")}
        </span>
      </div>
    );
  }

  const message = (() => {
    // The server says why it refused, and that is more useful than any
    // wording invented here.
    if (status === "refused")
      return detail || t("live_events.count_unavailable");
    if (status === "reconnecting") return t("live_events.reconnecting");
    return t("live_events.connecting");
  })();

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ${colors.idle}`}
      role="status"
      aria-live="polite"
    >
      <span className={`h-2 w-2 rounded-full ${colors.idleDot}`} aria-hidden />
      {message}
    </div>
  );
};

export default LiveViewerCount;
