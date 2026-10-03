import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import Marquee from "react-fast-marquee";
import { fetchPublicGroups } from "../mantras/api/accumulatorApi.ts";
import { getGroupTitleForLanguage } from "../mantras/utils/groupUtils.ts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.ts";
import type { PlanLanguageCode } from "../planviewer/utils/seriesUtils.ts";

type PartnerMarqueeProps = {
  apiLanguage: string;
  language: PlanLanguageCode;
};

/** How many partners to pull for the strip. */
const PARTNER_LIMIT = 50;

/** Below this there is too little to loop convincingly, so it sits still. */
const MINIMUM_TO_ANIMATE = 8;

/**
 * Pixels a second. A speed rather than a duration, so the strip travels at the
 * same pace whether there are eight partners or fifty.
 */
const SPEED = 40;

/** The band's own background, so the strip fades out rather than being cut. */
const BAND_COLOUR = "#0a1729";

const initialsOf = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "·";

/**
 * A slow strip of the groups practising here, filling the band below the hero.
 *
 * Sized to its own content, and to a fifth of the first screen from lg up, so
 * it stays visible instead of being clipped or pushed into the hero. The hero
 * is deliberately shorter than the window; this takes the rest, so the first
 * screen ends on the community rather than on empty space.
 *
 * The scrolling itself is react-fast-marquee's: it measures the band and repeats
 * the avatars as many times as it takes to fill it, so the loop has no seam at
 * any width. Because it repeats them, the strip is decorative and the partners
 * are named once in a list of their own for anyone reading the page aloud.
 */
const PartnerMarquee = ({ apiLanguage, language }: PartnerMarqueeProps) => {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const { data } = useQuery(
    ["public-groups-marquee", apiLanguage],
    () => fetchPublicGroups(apiLanguage, PARTNER_LIMIT),
    { refetchOnWindowFocus: false },
  );

  const groups = data?.groups ?? [];
  if (groups.length === 0) return null;

  // A continuously moving strip is a common migraine trigger, so anyone who has
  // asked for reduced motion gets the still row that short lists get.
  const shouldAnimate =
    groups.length >= MINIMUM_TO_ANIMATE && !prefersReducedMotion;

  const label = t("home.partners_label", "Practice spaces on WeBuddhist");

  const titlesById = groups.map((group) => ({
    id: group.id,
    avatarUrl: group.avatar_url,
    title: getGroupTitleForLanguage(group.metadata, language),
  }));

  const renderAvatar = (
    { id, avatarUrl, title }: (typeof titlesById)[number],
    decorative: boolean,
  ) => (
    <Avatar
      key={id}
      className={`size-12 ring-1 ring-white/25 sm:size-14 ${decorative ? "mr-6 sm:mr-10" : ""}`}
      title={title}
    >
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={decorative ? "" : title} />
      )}
      <AvatarFallback className="bg-white/10 text-xs font-semibold text-white/80">
        {initialsOf(title)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <section
      className="flex min-h-36 shrink-0 flex-col justify-center gap-3 overflow-x-hidden bg-[#0a1729] py-3 lg:min-h-[20%] lg:pb-14"
      aria-label={label}
    >
      <p className="px-4 mb-4 text-center text-[0.65rem] font-semibold uppercase  tracking-[0.24em] text-white/40 sm:px-6">
        {label}
      </p>

      {shouldAnimate ? (
        <>
          <ul className="sr-only">
            {titlesById.map(({ id, title }) => (
              <li key={id}>{title}</li>
            ))}
          </ul>

          <div aria-hidden="true">
            <Marquee
              speed={SPEED}
              autoFill
              gradient
              gradientColor={BAND_COLOUR}
              gradientWidth={72}
            >
              {titlesById.map((group) => renderAvatar(group, true))}
            </Marquee>
          </div>
        </>
      ) : (
        <ul className="flex items-center justify-center gap-6 sm:gap-10">
          {titlesById.map((group) => (
            <li key={group.id} className="shrink-0">
              {renderAvatar(group, false)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default PartnerMarquee;
