import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { FaGlobe, FaSearch } from "react-icons/fa";
import { useAuth } from "../../config/AuthContext.tsx";
import { useAuth0 } from "@auth0/auth0-react";
import {
  ACCESS_TOKEN,
  LANGUAGE,
  LOGGED_IN_VIA,
  REFRESH_TOKEN,
} from "../../utils/constants.ts";
import { useTolgee, useTranslate } from "@tolgee/react";
import { setFontVariables } from "../../config/commonConfigs.ts";
import { useQueryClient } from "react-query";
import {
  useEffect,
  useState,
  type CSSProperties,
  type FocusEvent,
  type FormEvent,
} from "react";
import { useCollectionColor } from "../../context/CollectionColorContext.tsx";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import NavSmallerScreen from "./NavSmallerScreen.tsx";

export const invalidateQueries = async (queryClient: any) => {
  const queriesToInvalidate = [
    "texts",
    "topics",
    "sheets",
    "sidePanel",
    "works",
    "texts-versions",
    "texts-content",
    "sheets-user-profile",
    "table-of-contents",
    "collections",
    "sub-collections",
    "versions",
  ];
  await Promise.all(
    queriesToInvalidate.map((query) => queryClient.invalidateQueries(query)),
  );
};
export const changeLanguage = async (
  lng: string,
  queryClient: any,
  tolgee: any,
) => {
  await tolgee.changeLanguage(lng);
  sessionStorage.setItem("textLanguage", lng);
  localStorage.setItem(LANGUAGE, lng);
  setFontVariables(lng);
  await invalidateQueries(queryClient);
};

/**
 * How the bar looks while it still floats over the hero: light text on a
 * transparent (or, on hover, dark-glass) chip.
 *
 * Rebinding the colour tokens rather than restyling each control, the way
 * the footer does at the other end of the screen - everything inside
 * picks the new values up without knowing where it is being rendered.
 */
const OVER_HERO = [
  "[--navbar-foreground:#ffffff]",
  "[--custom-border:rgba(255,255,255,0.35)]",
  "[--search-background:rgba(255,255,255,0.16)]",
  "[--background:transparent]",
  "[--accent:rgba(255,255,255,0.18)]",
  "[--accent-foreground:#ffffff]",
].join(" ");

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslate();
  const {
    isLoggedIn,
    logout: pechaLogout,
    isAuthLoading,
  } = useAuth() as {
    isLoggedIn: boolean;
    logout: () => void;
    isAuthLoading: boolean;
  };
  const { isAuthenticated, logout, isLoading: isAuth0Loading } = useAuth0();
  const tolgee = useTolgee(["language"]);
  const queryClient = useQueryClient();
  const { collectionColor } = useCollectionColor();
  const [searchTerm, setSearchTerm] = useState("");
  const [, setParams] = useSearchParams();

  /**
   * On the home page the bar floats over the hero image. It stays on the
   * white-over-photo theme while the hero is in view (a dark glass on hover,
   * so the controls stay readable) and becomes the ordinary cream bar only
   * after you scroll off the image. Everywhere else it is an opaque bar in
   * the flow.
   */
  // Only the front page has a hero for the bar to float over.
  const isHome = location.pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPointerOver, setIsPointerOver] = useState(false);

  // Stay on the white-over-photo theme for the whole hero, including hover.
  // Flipping to the cream bar just because the pointer entered made the
  // controls unreadable (grey on a leftover dark chip, or white on white).
  const isOverHero = isHome && !isScrolled;
  const isHeroHover = isOverHero && isPointerOver;
  const navControlClass =
    "rounded bg-transparent shadow-none border-custom-border text-faded-grey hover:bg-search-background hover:text-faded-grey dark:bg-transparent dark:border-custom-border dark:hover:bg-search-background dark:hover:text-faded-grey";

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(false);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const navItems = [
    { to: "/plans", label: t("header.plans"), key: "plans" },
    { to: "/collections", label: t("header.text"), key: "collections" },
    { to: "/about-us", label: t("about.tag"), key: "about" },
  ];

  const currentLanguage = tolgee.getLanguage();
  const isTibetan = currentLanguage === "bo-IN";

  const routesWithoutColorBorder = [
    "/",
    "/collections",
    "/login",
    "/register",
    "/signup",
    "/community",
    "/user",
  ];
  const shouldHideColorBorder = routesWithoutColorBorder.includes(
    location.pathname,
  );
  const heroSurfaceClass = isHeroHover
    ? "backdrop-blur-md border-b-2 border-white/20 [--navbar:rgba(10,23,41,0.72)]"
    : "border-b-2 border-transparent [--navbar:transparent]";
  const overHeroClasses = isOverHero
    ? `${OVER_HERO} ${heroSurfaceClass}`
    : "border-b-2 border-custom-border";
  // Collection colour is a runtime hex from context, so Tailwind cannot
  // name it. It only tints the bar's own bottom edge, not the tokens
  // the controls inherit.
  const collectionBorderStyle: CSSProperties | undefined =
    !isOverHero && !shouldHideColorBorder && collectionColor
      ? { borderBottomColor: collectionColor }
      : undefined;

  const handleMouseEnter = () => setIsPointerOver(true);
  const handleMouseLeave = () => setIsPointerOver(false);
  const handleFocus = () => setIsPointerOver(true);
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsPointerOver(false);
    }
  };

  const handleLogout = (e: any) => {
    e.preventDefault();
    localStorage.removeItem(LOGGED_IN_VIA);
    sessionStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    isLoggedIn && pechaLogout();
    isAuthenticated && logout();

    if (isLoggedIn && !isAuthenticated) {
      navigate("/login");
    }
  };
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
    }
  };

  const handleLangSelect = (lng: string) => {
    changeLanguage(lng, queryClient, tolgee);
    setParams((prev) => {
      prev.set("lang", lng);
      return prev;
    });
  };

  const renderAuthButtons = (variant: "desktop" | "mobile") => {
    if (isAuth0Loading || isAuthLoading) {
      return <div className="text-sm text-faded-grey">Loading...</div>;
    }
    if (!isLoggedIn && !isAuthenticated) {
      return (
        <div
          className={
            variant === "desktop"
              ? "hidden md:flex items-center gap-2.5 text-sm"
              : "flex flex-col gap-2 text-sm"
          }
        >
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            className={navControlClass}
            aria-label="Go to login"
          >
            {t("login.form.button.login_in")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/register")}
            className={navControlClass}
            aria-label="Go to sign up"
          >
            {t("common.sign_up")}
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        className={
          variant === "desktop" ? navControlClass : `w-full ${navControlClass}`
        }
        onClick={handleLogout}
      >
        {t("profile.log_out")}
      </Button>
    );
  };
  const renderLanguageDropdown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center p-1.5 rounded text-faded-grey hover:bg-search-background hover:text-faded-grey transition-colors"
            aria-label="Change language"
          >
            <FaGlobe className="text-faded-grey" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[120px]">
          <DropdownMenuItem onClick={() => handleLangSelect("en")}>
            English
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLangSelect("bo-IN")}>
            བོད་ཡིག
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleLangSelect("zh-Hans-CN")}>
            中文
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`${isTibetan && "text-sm"} overalltext bg-navbar h-[60px] flex justify-between items-center w-full px-4 md:px-7 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        isHome ? "fixed inset-x-0 top-0 z-50" : ""
      } ${overHeroClasses}`}
      style={collectionBorderStyle}
    >
      <div className="flex items-center gap-x-4">
        <Link
          to="/"
          className="flex items-center"
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              window.location.reload();
            }
          }}
        >
          <img
            className={`h-[30px] transition duration-300 `}
            src={
              !isOverHero
                ? "/img/light_mode_logo.svg"
                : "/img/dark_mode_logo.svg"
            }
            alt="Webuddhist"
          />
        </Link>
        <div className={`hidden md:flex space-x-8`}>
          {navItems.map((navItem) => (
            <Link
              key={navItem.key}
              className={`no-underline text-faded-grey font-medium ${isTibetan ? "text-sm" : "text-base"} hover:underline transition-all`}
              to={navItem.to}
            >
              {navItem.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <form
          className="hidden md:flex items-center rounded-lg border border-custom-border bg-search-background"
          onSubmit={handleSearchSubmit}
        >
          <FaSearch className="ml-1.5 text-faded-grey" />
          <input
            type="search"
            placeholder={t("common.placeholder.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-none bg-transparent outline-none px-1 py-1.5 content text-faded-grey placeholder:text-faded-grey"
          />
        </form>
        {renderAuthButtons("desktop")}
        <div className="hidden md:block">
          {(isAuthenticated || isLoggedIn) && (
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              className={navControlClass}
            >
              {t("header.profileMenu.profile")}
            </Button>
          )}
        </div>
        {renderLanguageDropdown()}
        <NavSmallerScreen
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchSubmit={handleSearchSubmit}
          navItems={navItems}
          renderAuthButtons={renderAuthButtons}
          isAuthenticated={isAuthenticated}
          isLoggedIn={isLoggedIn}
          onProfileNavigate={() => navigate("/profile")}
          translate={t}
        />
      </div>
    </div>
  );
};

export default Navigation;
