import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useTranslate } from "@tolgee/react";
import {
  IoGlobeOutline,
  IoMenu,
  IoPersonOutline,
  IoSearch,
} from "react-icons/io5";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../config/AuthContext.tsx";
import { useLogout } from "../useLogout.ts";
import { useSiteLanguage } from "./useSiteLanguage.ts";
import MobileSearch from "./MobileSearch.tsx";
import SearchField from "./SearchField.tsx";
import MobileMenu from "./MobileMenu.tsx";

const ICON_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-search-background";

/** The query on the search results page, or "" anywhere else. */
const useCurrentSearch = () => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  return pathname === "/search" ? (searchParams.get("q") ?? "") : "";
};

const useAuthState = () => {
  const { isLoggedIn, isAuthLoading } = useAuth() as {
    isLoggedIn: boolean;
    isAuthLoading: boolean;
  };
  const { isAuthenticated, isLoading: isAuth0Loading } = useAuth0();
  return {
    isSignedIn: isLoggedIn || isAuthenticated,
    isAuthPending: isAuthLoading || isAuth0Loading,
  };
};

/**
 * The bar above the content in the sidebar shell.
 *
 * On a wide screen: a search field on the left, account on the right, with
 * navigation left to the sidebar. On a phone, where the sidebar gives way
 * to the bottom tab bar, it becomes the wordmark and a row of icons -
 * search, language, menu, account - each opening its own screen or menu.
 */
const AppTopBar = () => {
  const { isMobile } = useSidebar();
  return (
    <header className="overalltext sticky top-0 z-20 flex h-[60px] items-center gap-3 bg-background/90 px-4 backdrop-blur md:px-8">
      {isMobile ? <PhoneBar /> : <DesktopBar />}
    </header>
  );
};

const DesktopBar = () => {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const { isSignedIn, isAuthPending } = useAuthState();
  const searchedFor = useCurrentSearch();
  const [searchTerm, setSearchTerm] = useState(searchedFor);

  // On the results page the field shows what was searched for, so it can be
  // refined in place; anywhere else it starts empty.
  useEffect(() => setSearchTerm(searchedFor), [searchedFor]);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* There is no search screen to close here, so the ✕ clears the field
          instead - and only appears once there is something to clear. */}
      <SearchField
        ref={inputRef}
        className="w-full max-w-md"
        value={searchTerm}
        onChange={setSearchTerm}
        onSubmit={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)}
        onDismiss={
          searchTerm
            ? () => {
                setSearchTerm("");
                inputRef.current?.focus();
              }
            : undefined
        }
        dismissLabel={t("search_page.clear", "Clear search")}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {isAuthPending ? (
          <div className="size-9 animate-pulse rounded-full bg-search-background" />
        ) : isSignedIn ? (
          <AccountMenu />
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="rounded-full text-primary"
            >
              {t("login.form.button.login_in")}
            </Button>
            <Button
              onClick={() => navigate("/register")}
              className="rounded-full"
            >
              {t("common.sign_up")}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

const PhoneBar = () => {
  const { t } = useTranslate();
  const { languages, current, select } = useSiteLanguage();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const searchedFor = useCurrentSearch();

  return (
    <>
      <Link to="/" className="mr-auto shrink-0">
        <img src="/img/light_mode_logo.svg" alt="Webuddhist" className="h-7" />
      </Link>

      <div className="-mr-2 flex items-center">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label={t("common.placeholder.search")}
          className={ICON_BUTTON}
        >
          <IoSearch className="size-[22px]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("header.change_language", "Change language")}
              className={ICON_BUTTON}
            >
              <IoGlobeOutline className="size-[22px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {languages.map(({ code, label }) => (
              <DropdownMenuItem
                key={code}
                onClick={() => select(code)}
                className={cn(code === current.code && "font-semibold")}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          aria-label={t("header.menu", "Menu")}
          className={ICON_BUTTON}
        >
          <IoMenu className="size-6" />
        </button>

        <AccountMenu />
      </div>

      {isSearchOpen && (
        <MobileSearch onClose={closeSearch} initialQuery={searchedFor} />
      )}
      <MobileMenu open={isMenuOpen} onOpenChange={setIsMenuOpen} />
    </>
  );
};

/**
 * The round account button. Signed in, it leads to the profile and logging
 * out; signed out (on a phone, where there is no room for both buttons) to
 * logging in or signing up.
 */
const AccountMenu = () => {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const handleLogout = useLogout();
  const { isSignedIn, isAuthPending } = useAuthState();

  if (isAuthPending) {
    return (
      <div className="ml-1 size-9 animate-pulse rounded-full bg-search-background" />
    );
  }

  let items: ReactNode;
  if (isSignedIn) {
    items = (
      <>
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          {t("header.profileMenu.profile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          {t("profile.log_out")}
        </DropdownMenuItem>
      </>
    );
  } else {
    items = (
      <>
        <DropdownMenuItem onClick={() => navigate("/login")}>
          {t("login.form.button.login_in")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/register")}>
          {t("common.sign_up")}
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("header.profileMenu.profile")}
          className="ml-1 flex size-9 items-center justify-center rounded-full bg-search-background text-primary transition-colors hover:bg-custom-border"
        >
          <IoPersonOutline className="size-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppTopBar;
