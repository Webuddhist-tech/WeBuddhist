import { useState } from "react";
import { useQuery } from "react-query";
import { useTranslate } from "@tolgee/react";
import { fetchVerseOfDayToday } from "../../planviewer/api/plansApi.ts";

const FALLBACK_IMAGE = "/img/buddha_hero.jpg";

/**
 * The opening claim, set large in the reader's serif with one word picked
 * out in red, beside today's verse image.
 *
 * Shares the verse-of-day query with the cards below and the verse page.
 */
const HeroSection = ({ apiLanguage }: { apiLanguage: string }) => {
  const { t } = useTranslate();
  const { data } = useQuery(
    ["verse-of-day", apiLanguage],
    () => fetchVerseOfDayToday(apiLanguage),
    { refetchOnWindowFocus: false },
  );
  const imageUrl = data?.verse_of_day?.image_url || FALLBACK_IMAGE;
  // The verse image is a presigned link that expires; fall back to the
  // bundled photograph rather than show a broken image.
  const [failed, setFailed] = useState(false);

  return (
    <section className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:py-20">
      <h1 className="en-serif-text text-5xl leading-[1.05] text-primary sm:text-6xl lg:text-7xl">
        {t("home.hero_we", "We learn,")}{" "}
        <span className="text-rose-600">
          {t("home.hero_practice", "practice")}
        </span>{" "}
        {t("home.hero_connect", "and connect.")}{" "}
        <em>{t("home.masthead_accent", "Daily.")}</em>
      </h1>
      <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
        <div className="absolute -inset-3 -rotate-3 rounded-[2rem] bg-rose-600/10" />
        <img
          src={failed ? FALLBACK_IMAGE : imageUrl}
          onError={() => setFailed(true)}
          alt=""
          data-testid="hero-image"
          className="relative aspect-square w-full rotate-2 rounded-[2rem] object-cover shadow-xl"
        />
      </div>
    </section>
  );
};

export default HeroSection;
