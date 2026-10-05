import type { ComponentType } from "react";
import { useLocation } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import {
  IoBook,
  IoBookOutline,
  IoCalendarClear,
  IoCalendarClearOutline,
  IoHome,
  IoHomeOutline,
  IoInformationCircle,
  IoInformationCircleOutline,
  IoPeople,
  IoPeopleOutline,
  IoRadio,
  IoRadioOutline,
  IoSunny,
  IoSunnyOutline,
} from "react-icons/io5";

export type NavItem = {
  to: string;
  label: string;
  /** A shorter name where space is tight, like the phone's bottom bar. */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  /** The filled version, for the phone's bottom bar to mark where you are. */
  activeIcon: ComponentType<{ className?: string }>;
  /** Only light up on this exact path, not on everything beneath it. */
  exact?: boolean;
  /** Other sections that belong to this one, like a text under the library. */
  alsoActiveOn?: string[];
};

/**
 * The sections of the sidebar shell, shared by the sidebar and the phone's
 * bottom bar so the two always offer the same places.
 *
 * `primary` is the everyday set - it is what the bottom bar shows - and
 * `secondary` the rest, which on a phone stays in the drawer.
 */
export const useNavItems = () => {
  const { t } = useTranslate();
  const { pathname } = useLocation();

  const primary: NavItem[] = [
    {
      to: "/",
      label: t("header.home", "Home"),
      icon: IoHomeOutline,
      activeIcon: IoHome,
      exact: true,
    },
    {
      to: "/verse-of-the-day",
      label: t("plans.verse_of_day", "Verse of the day"),
      shortLabel: t("header.today", "Today"),
      icon: IoSunnyOutline,
      activeIcon: IoSunny,
    },
    {
      to: "/collections",
      label: t("header.text"),
      icon: IoBookOutline,
      activeIcon: IoBook,
      alsoActiveOn: ["/works", "/texts", "/chapter"],
    },
    {
      to: "/plans",
      label: t("header.plans"),
      icon: IoCalendarClearOutline,
      activeIcon: IoCalendarClear,
    },
    {
      to: "/live",
      label: t("header.live"),
      icon: IoRadioOutline,
      activeIcon: IoRadio,
    },
    {
      to: "/spaces",
      label: t("header.practice_groups", "Practice spaces"),
      shortLabel: t("header.groups", "Groups"),
      icon: IoPeopleOutline,
      activeIcon: IoPeople,
    },
  ];
  const secondary: NavItem[] = [
    {
      to: "/about",
      label: t("about.title", "About"),
      icon: IoInformationCircleOutline,
      activeIcon: IoInformationCircle,
    },
  ];

  const matches = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);
  const isActive = ({ to, exact, alsoActiveOn = [] }: NavItem) =>
    exact ? pathname === to : [to, ...alsoActiveOn].some(matches);

  return { primary, secondary, isActive };
};
