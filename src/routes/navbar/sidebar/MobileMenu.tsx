import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useTranslate } from "@tolgee/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import DownloadAppModal from "../../../components/DownloadAppModal.tsx";
import { useAuth } from "../../../config/AuthContext.tsx";
import {
  isMobileDevice,
  openAppDownloadPage,
} from "../../../utils/deviceUtils.ts";
import { useLogout } from "../useLogout.ts";
import { useNavItems } from "./navItems.ts";

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base text-primary transition-colors hover:bg-search-background";

type MobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The phone's menu, sliding in from the right: account first, then a pitch
 * for the app, then whatever the bottom bar has no room for.
 */
const MobileMenu = ({ open, onOpenChange }: MobileMenuProps) => {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const { secondary, isActive } = useNavItems();
  const { isLoggedIn } = useAuth() as { isLoggedIn: boolean };
  const { isAuthenticated } = useAuth0();
  const handleLogout = useLogout();
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const isSignedIn = isLoggedIn || isAuthenticated;

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleGetApp = () => {
    onOpenChange(false);
    if (isMobileDevice()) {
      openAppDownloadPage();
      return;
    }
    setDownloadModalOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="overalltext w-[85%] max-w-sm gap-0 overflow-y-auto p-3 pt-12"
        >
          <SheetTitle className="sr-only">
            {t("header.menu", "Menu")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("header.menu", "Menu")}
          </SheetDescription>

          {isSignedIn ? (
            <>
              <button
                type="button"
                onClick={() => go("/profile")}
                className={cn(ROW_CLASS, "bg-search-background font-medium")}
              >
                {t("header.profileMenu.profile")}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  onOpenChange(false);
                  handleLogout(e);
                }}
                className={ROW_CLASS}
              >
                {t("profile.log_out")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => go("/login")}
                className={cn(ROW_CLASS, "bg-search-background font-medium")}
              >
                {t("login.form.button.login_in")}
              </button>
              <button
                type="button"
                onClick={() => go("/register")}
                className={ROW_CLASS}
              >
                {t("common.sign_up")}
              </button>
            </>
          )}

          <div className="mt-3 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-4">
            <div className="flex items-start gap-3">
              <img
                src="/img/logo.png"
                alt=""
                className="size-10 shrink-0 rounded-xl bg-white p-1"
              />
              <p className="text-sm text-primary">
                {t(
                  "home.app_pitch",
                  "Read the texts, follow a plan and count your mala, every day.",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetApp}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t("home.mala_action", "Get the app")}
            </button>
          </div>

          <nav aria-label={t("header.menu", "Menu")} className="mt-3">
            {secondary.map((item) => {
              const active = isActive(item);
              const Icon = active ? item.activeIcon : item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => onOpenChange(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    ROW_CLASS,
                    "text-sm",
                    active ? "font-semibold" : "text-faded-grey",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <DownloadAppModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />
    </>
  );
};

export default MobileMenu;
