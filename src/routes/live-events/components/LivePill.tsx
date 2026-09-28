import { useTranslate } from "@tolgee/react";

/** The red "live now" marker, shared by the card and the detail header. */
const LivePill = ({ className = "" }: { className?: string }) => {
  const { t } = useTranslate();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {t("live_events.live_now")}
    </span>
  );
};

export default LivePill;
