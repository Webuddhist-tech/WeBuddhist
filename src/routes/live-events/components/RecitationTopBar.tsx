import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { siteName } from "../../../utils/constants.ts";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";

type RecitationTopBarProps = {
  /** Where the mark leads: the event's own page. */
  backTo: string;
  backLabel: string;
  title: string;
  titleLanguage?: string;
  /** Gives the title an id, for the page to name itself by. */
  titleId?: string;
  subtitle?: string | null;
  subtitleLanguage?: string;
  /** How far through its text the room is, drawn along the foot of the bar. */
  progress?: {
    current: number;
    total: number;
    label: string;
  } | null;
  /** The bar's right-hand side: the live marker and the page's buttons. */
  children?: ReactNode;
};

/**
 * The live recitation's one bar, after the follow-along page an umdze puts up
 * for a hall: the mark and what is being recited on the left, a few round
 * buttons on the right, and a hairline along the bottom that fills as the
 * room moves through the text. Nothing else stands between reader and text.
 */
const RecitationTopBar = ({
  backTo,
  backLabel,
  title,
  titleLanguage,
  titleId,
  subtitle,
  subtitleLanguage,
  progress,
  children,
}: RecitationTopBarProps) => (
  <header className="relative z-20 flex shrink-0 items-center gap-2 border-b border-[var(--rt-line)] bg-[var(--rt-stage)] py-2.5 pl-4 pr-3 transition-colors duration-500 max-[380px]:gap-1.5 max-[380px]:pl-3 max-[380px]:pr-2.5">
    <Link
      to={backTo}
      aria-label={backLabel}
      title={backLabel}
      className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rt-accent)]"
    >
      <img
        src="/img/logo.png"
        alt={siteName}
        className="size-[34px] max-[380px]:size-[30px]"
      />
    </Link>

    <div className="mr-auto flex min-w-0 flex-col pl-0.5">
      <h1
        id={titleId}
        className={`truncate text-[15px] font-semibold leading-snug text-[var(--rt-ink)] max-[380px]:text-[13.5px] ${getLanguageClass(titleLanguage)}`}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={`truncate text-xs leading-snug text-[var(--rt-soft)] ${getLanguageClass(subtitleLanguage)}`}
        >
          {subtitle}
        </p>
      )}
    </div>

    {children}

    {progress && (
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={progress.total}
        aria-valuenow={progress.current}
        aria-valuetext={progress.label}
        className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5"
      >
        <span
          className="block h-full bg-gradient-to-r from-transparent to-[var(--rt-accent)] transition-[width] duration-700"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>
    )}
  </header>
);

export default RecitationTopBar;
