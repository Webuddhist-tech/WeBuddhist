import {
  DISMISS_KEY,
  DISMISS_TIME_INTERVAL_MS,
  PLAY_STORE_URL,
  APP_STORE_URL,
} from "@/utils/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslate } from "@tolgee/react";

export default function AppOpenBanner() {
  const { t } = useTranslate();
  const [visible, setVisible] = useState(false);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    if (searchParams.get("redirected") === "true") {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      return;
    }

    const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsAppleDevice(isApple);

    const dismissedAt = localStorage.getItem(DISMISS_KEY);

    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_TIME_INTERVAL_MS) return;
    }

    setVisible(true);
  }, [searchParams]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleDismiss();
  };

  return (
    <Dialog open={visible} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/60 backdrop-blur-lg shadow-lg border border-white/30">
        <DialogHeader>
          <DialogTitle>
            {t("app_banner.title", "Get our Mobile App")}
          </DialogTitle>
          <DialogDescription>
            <span
              className="block text-gray-700 text-center italic mb-2"
              aria-label={t("app_banner.quote_label", "inspirational quote")}
            >
              {t(
                "app_banner.quote",
                "”The mind is everything. What you think you become.” — Buddha",
              )}
            </span>
          </DialogDescription>
        </DialogHeader>
        <img
          src="/img/QR-download.png"
          alt={t("plans.download_app_qr_alt", "QR code to download WeBuddhist")}
          className="w-full h-auto rounded-3xl"
          width={100}
          height={100}
        />
        <a
          href={isAppleDevice ? APP_STORE_URL : PLAY_STORE_URL}
          className="flex w-full items-center justify-center rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
          tabIndex={0}
          aria-label={t("app_banner.store_link", "Open mobile app store link")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              (e.currentTarget as HTMLAnchorElement).click();
            }
          }}
        >
          {t("app_banner.download_now", "Download now")}
        </a>
      </DialogContent>
    </Dialog>
  );
}
