import { useTranslate } from "@tolgee/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../../utils/constants.ts";
import { PANEL_CLASS } from "../components/HomeSection.tsx";
import { cn } from "@/lib/utils";

const STORE_LINK =
  "inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition";

/** The closing pitch for the mobile app, with both store links. */
const AppSection = () => {
  const { t } = useTranslate();
  return (
    <section className={cn(PANEL_CLASS, "px-6 py-12 text-center sm:py-16")}>
      <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
        {t("home.app_title", "Free mobile app")}
      </h2>
      <p className="mt-3 text-primary/80">
        {t("home.app_body", "Your practice. On every screen.")}
      </p>
      <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-[#0a1729] to-[#102544] px-8 py-10 text-white shadow-xl">
        <img
          src="/img/logo.png"
          alt=""
          className="size-16 rounded-2xl bg-white p-2"
        />
        <p className="text-2xl font-bold">WeBuddhist</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              STORE_LINK,
              "bg-white text-primary hover:bg-white/90",
            )}
          >
            <FaApple className="size-4" />
            {t("plans.download_app_store", "App Store")}
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              STORE_LINK,
              "border border-white/40 text-white hover:bg-white/10",
            )}
          >
            <FaGooglePlay className="size-4" />
            {t("plans.download_app_play", "Google Play")}
          </a>
        </div>
      </div>
    </section>
  );
};

export default AppSection;
