import type { CSSProperties } from "react";
import { useTranslate } from "@tolgee/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getLanguageClass } from "../../../utils/helperFunctions.tsx";
import type { EventLiturgy } from "../types.ts";
import { shortTitle } from "../utils/shortTitle.ts";

/** A heading of the text being recited, with the line it begins on. */
export type RecitationSection = {
  id: string;
  title: string;
  depth: number;
  /** Null for a heading no line of the loaded text falls under. */
  line: number | null;
};

type RecitationMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The page's colours: the drawer opens in a portal, outside the page. */
  themeStyle: CSSProperties;
  liturgies: EventLiturgy[];
  /** Which liturgy the room is on, by any id it goes by. */
  isCurrentLiturgy: (liturgy: EventLiturgy) => boolean;
  sections: RecitationSection[];
  activeSectionId: string | null;
  onSelectSection: (line: number) => void;
};

const TIBETAN = /[ༀ-࿿]/;

/** Tibetan titles in the Tibetan face; anything else in the page's own. */
const scriptClass = (title: string) =>
  TIBETAN.test(title)
    ? `${getLanguageClass("bo")} text-[17px] leading-relaxed`
    : "text-sm leading-snug";

const HEADING =
  "mx-2 mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]";

/**
 * The order of service and the outline of the text the room is on, as the
 * live controller lists them: the event's liturgies, then the sections of the
 * current one. A section takes the reader to where it begins; the liturgies
 * say where the puja is, as the room cannot be followed into another one.
 *
 * Titles are given without the formula a Tibetan title page wraps them in,
 * and run to two lines at most; the whole title is there on hover.
 */
const RecitationMenu = ({
  open,
  onOpenChange,
  themeStyle,
  liturgies,
  isCurrentLiturgy,
  sections,
  activeSectionId,
  onSelectSection,
}: RecitationMenuProps) => {
  const { t } = useTranslate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={themeStyle}
        className="w-[min(24rem,88vw)] gap-0 border-[var(--rt-line)] bg-[var(--rt-panel)] p-0 text-[var(--rt-ink)] sm:max-w-sm"
      >
        <SheetHeader className="border-b border-[var(--rt-line)] px-5 py-4 pr-12">
          <SheetTitle className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--rt-soft)]">
            {t("live_events.recitation_contents")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("live_events.recitation_contents_hint")}
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label={t("live_events.recitation_contents")}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
        >
          {liturgies.length > 0 && (
            <section>
              <h3 className={HEADING}>
                {t("live_events.recitation_liturgies")}
              </h3>
              <ol className="space-y-0.5">
                {liturgies.map((liturgy) => {
                  const current = isCurrentLiturgy(liturgy);
                  const title = shortTitle(liturgy.title);
                  return (
                    <li
                      key={liturgy.textId}
                      aria-current={current ? "true" : undefined}
                      title={liturgy.title}
                      className={`line-clamp-2 rounded-[7px] px-3 py-1.5 ${scriptClass(title)} ${
                        current
                          ? "bg-[var(--rt-accent)] text-white"
                          : "text-[var(--rt-soft)]"
                      }`}
                    >
                      {title}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {sections.length > 0 && (
            <section>
              <h3 className={HEADING}>
                {t("live_events.recitation_sections")}
              </h3>
              <ol className="space-y-0.5">
                {sections.map((section) => {
                  const active = section.id === activeSectionId;
                  const reachable = section.line !== null;
                  const title = shortTitle(section.title);
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        disabled={!reachable}
                        aria-current={active ? "true" : undefined}
                        title={section.title}
                        onClick={() => {
                          if (section.line !== null)
                            onSelectSection(section.line);
                        }}
                        // Outlines nest deeply, so the indent stops at three
                        // levels and the titles keep their width.
                        style={{
                          paddingLeft: 12 + Math.min(section.depth, 3) * 12,
                        }}
                        className={`block w-full rounded-[7px] py-1.5 pr-3 text-left transition-colors duration-500 ${scriptClass(title)} ${
                          active
                            ? "bg-[var(--rt-accent)] text-white"
                            : reachable
                              ? "cursor-pointer text-[var(--rt-soft)] hover:bg-[var(--rt-raised)] hover:text-[var(--rt-ink)]"
                              : "cursor-default text-[var(--rt-faint)] opacity-60"
                        }`}
                      >
                        <span className="line-clamp-2">{title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {liturgies.length === 0 && sections.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-[var(--rt-soft)]">
              {t("live_events.recitation_no_contents")}
            </p>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default RecitationMenu;
