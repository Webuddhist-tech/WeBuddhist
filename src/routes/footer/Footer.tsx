import { getLanguageClass } from "@/utils/helperFunctions";
import { useTranslate } from "@tolgee/react";
import { useEffect, useState, type FocusEvent } from "react";
import {
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

type LinkItem = {
  href: string;
  labelKey: string;
  /** Translation key; links without one are names that stay as they are. */
  i18nKey?: string;
};

type FooterColumn = {
  title: string;
  links: LinkItem[];
  useTranslation?: boolean;
};

export const columns: FooterColumn[] = [
  {
    title: "footer.tools",
    links: [
      {
        href: "https://buddhistai.tools/",
        labelKey: "Buddhist AI Studio",
      },
      { href: "https://sherab.org/", labelKey: "Sherab" },
    ],
  },
  {
    title: "footer.developers",
    links: [
      {
        href: "https://github.com/OpenPecha",
        labelKey: "Fork us on GitHub",
        i18nKey: "footer.fork_github",
      },
      {
        href: "https://discord.com/invite/7GFpPFSTeA",
        labelKey: "Discord",
      },
    ],
  },
  {
    title: "footer.about",
    links: [
      {
        href: "https://dharmaduta.in/about",
        labelKey: "About Us",
        i18nKey: "footer.about_us",
      },
      {
        href: "https://dharmaduta.in/team",
        labelKey: "Team",
        i18nKey: "footer.team",
      },
      {
        href: "https://dharmaduta.in/projects",
        labelKey: "Products",
        i18nKey: "footer.products",
      },
    ],
  },
];

const connectLinks = [
  {
    href: "https://www.instagram.com/we.buddhist/",
    icon: <FaInstagram className="size-5" />,
  },
  {
    href: "https://www.facebook.com/profile.php?id=61578322432088",
    icon: <FaFacebook className="size-5" />,
  },
  {
    href: "mailto:contact@dharmaduta.in",
    icon: <FaEnvelope className="size-5" />,
  },
  {
    href: "https://www.linkedin.com/company/webuddhist/",
    icon: <FaLinkedinIn className="size-5" />,
  },
  {
    href: "https://www.youtube.com/@WeBuddhistmedia",
    icon: <FaYoutube className="size-5" />,
  },
];

/** How far the page has to move before the bar takes on its background. */
const SCROLL_THRESHOLD = 24;

/**
 * How the peeking bar looks while it is still over the hero: no background of
 * its own, no rule above it, and light text to sit on the dark band behind it.
 *
 * Rebinding the colour tokens rather than restyling each piece of text, the way
 * the navigation bar does at the other end of the screen - everything inside
 * picks the new values up without knowing where it is being rendered. The
 * border goes fully transparent rather than merely faint: the bar and the row
 * inside it each carry a top border, and with the columns collapsed the two sit
 * on the same line, so any colour at all draws a rule across the hero.
 *
 * From `lg` up only, which is where the bar is pinned over the hero at all.
 * Below that it sits at the end of a light page in the ordinary way.
 */
const OVER_HERO = [
  "lg:bg-transparent",
  "lg:[--foreground:#ffffff]",
  "lg:[--muted-foreground:rgba(255,255,255,0.75)]",
  "lg:[--custom-border:transparent]",
].join(" ");

const Footer = () => {
  const { t } = useTranslate();
  const { pathname } = useLocation();

  /**
   * On the home page the footer is a slim bar the height of the navigation,
   * pinned to the bottom of the window and opening upwards on hover. In normal
   * flow it sat at the end of the document, so you had to scroll the whole page
   * down before there was anything to hover over.
   *
   * Confined to large screens on purpose: a touch device has no hover, so a
   * pinned bar that only opens on hover would just be a footer nobody can read.
   * It opens on focus-within too, so tabbing into the links reveals them.
   */
  const isPeek = pathname === "/";

  const [isScrolled, setIsScrolled] = useState(false);
  // Pointer or keyboard is in the footer - which is also what opens it, so the
  // panel is never asked to be readable without a background behind it.
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isPeek) {
      setIsScrolled(false);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPeek]);

  /**
   * The bar rests over the last of the hero band, so it starts transparent and
   * takes its background once the page has moved - the same trade the
   * navigation bar makes at the top of the screen.
   */
  const isOverHero = isPeek && !isScrolled && !isOpen;

  // Only the peeking bar cares: everywhere else the footer is opaque whatever
  // the pointer is doing.
  const peekHandlers = isPeek
    ? {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: () => setIsOpen(false),
        onFocus: () => setIsOpen(true),
        // Focus moving between the footer's own links is not focus leaving it;
        // without this the background would blink on every tab press.
        onBlur: (event: FocusEvent<HTMLElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsOpen(false);
          }
        },
      }
    : {};

  return (
    <footer
      {...peekHandlers}
      className={`group relative z-10 border-t border-custom-border bg-background transition-colors duration-300 ${
        isPeek ? "lg:fixed lg:inset-x-0 lg:bottom-0" : ""
      } ${isOverHero ? OVER_HERO : ""}`}
    >
      <div
        className={
          isPeek
            ? "grid grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-within:grid-rows-[1fr]"
            : ""
        }
      >
        <div className={isPeek ? "overflow-hidden" : ""}>
          <div className="flex max-sm:space-y-8 max-sm:flex-col px-3 py-4 sm:p-6 md:py-12 lg:px-8">
            <div className="flex-1 items-center justify-center">
              <div className="flex w-full flex-col text-start">
                {/* Centred on a phone, where the column runs full width. */}
                <div className="flex items-center justify-center sm:justify-start">
                  <img
                    src="/img/logo.png"
                    alt="logo"
                    width={150}
                    height={150}
                  />
                </div>
                <div className="flex w-full max-w-xl">
                  <p className="text-sm md:text-base text-muted-foreground">
                    Buddhism in your own words
                  </p>
                </div>
                <div className="flex mt-4 w-full items-center space-x-4">
                  {connectLinks.map(({ href, icon }) => (
                    <span className="p-2 bg-[#deac2c] rounded-full" key={href}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white"
                      >
                        {icon}
                      </a>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-1 md:flex md:justify-around grid grid-cols-2 md:grid-cols-4 gap-4">
              {columns.map(({ title, links }) => (
                <div key={title} className="text-left">
                  <h3 className=" text-faded-grey uppercase overalltext font-semibold  mb-2 text-sm">
                    {t(title)}
                  </h3>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2">
                    {links.map(({ href, labelKey }) => (
                      <li key={labelKey}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-faded-grey ${getLanguageClass("en-san")} text-sm hover:text-black transition-colors`}
                        >
                          {labelKey}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`border-t border-custom-border px-3 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 ${
          isPeek ? "lg:h-[60px] lg:py-0" : ""
        }`}
      >
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} WeBuddhist · OpenPecha Trust. All
          rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/privacy-policy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            aria-label="Privacy Policy"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            aria-label="Terms of Service"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
