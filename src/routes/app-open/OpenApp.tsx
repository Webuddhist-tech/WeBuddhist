import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../utils/constants.ts";
import {
  appStoreRedirectUrl,
  detectAppPlatform,
} from "../../utils/deviceUtils.ts";

/**
 * The /open landing page - where an app link ends up when the app did not
 * open it, because it is not installed.
 *
 * In production nginx serves a static copy of this page for exactly "/open";
 * this one catches every other /open address (a deep link such as
 * /open/plan/123, and the dev server), which used to fall through to the
 * catch-all route and land on the home page.
 *
 * A phone is sent on to its app store straight away; a computer gets the QR
 * code to scan and both store buttons.
 */
const OpenApp = () => {
  const { t } = useTranslate();
  const { pathname, search } = useLocation();
  const platform = detectAppPlatform();
  const redirectUrl = appStoreRedirectUrl(platform, `${pathname}${search}`);

  useEffect(() => {
    // replace(), so Back from the store does not land here and bounce again.
    if (redirectUrl) window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return (
    <div className="overalltext flex min-h-dvh flex-col items-center justify-center bg-[#faf8f5] px-6 py-12 text-center">
      <img src="/img/logo.png" alt="" className="size-16" />
      <h1 className="mt-5 text-2xl font-semibold text-primary">
        {redirectUrl
          ? t("open_app.opening", "Opening WeBuddhist…")
          : t("open_app.get_the_app", "Get the WeBuddhist app")}
      </h1>
      <p className="mt-2 max-w-sm text-faded-grey">
        {redirectUrl
          ? t(
              "open_app.redirecting",
              "Taking you to the app store to install the app.",
            )
          : t(
              "plans.download_app_qr_body",
              "Scan the QR code with your phone or download from your app store.",
            )}
      </p>
      {!redirectUrl && (
        <img
          src="/img/QR-download.png"
          alt={t("plans.download_app_qr_alt", "QR code to download WeBuddhist")}
          className="mt-8 w-full max-w-[220px] rounded-2xl"
          width={220}
          height={220}
        />
      )}
      {/* Kept on phones too, in case the redirect is blocked. */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={APP_STORE_URL}
          className="inline-flex items-center gap-2.5 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/85"
        >
          <FaApple className="size-4" />
          {t("plans.download_app_store", "App Store")}
        </a>
        <a
          href={PLAY_STORE_URL}
          className="inline-flex items-center gap-2.5 rounded-full bg-[#34a853] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c9147]"
        >
          <FaGooglePlay className="size-4" />
          {t("plans.download_app_play", "Google Play")}
        </a>
      </div>
    </div>
  );
};

export default OpenApp;
