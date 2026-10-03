import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavItems } from "./navItems.ts";

/**
 * The phone's tab bar: the everyday sections pinned to the bottom of the
 * screen, an outline icon over a label, filled in for the page you are on.
 *
 * Phones only - on a wider screen the sidebar does this job. The layout
 * keeps the bar's height (h-16) clear below the page so it never covers the
 * footer. The rest of the navigation (About, language) stays in the drawer
 * behind the menu button.
 */
const AppBottomNav = () => {
  const { primary, isActive } = useNavItems();

  return (
    <nav
      aria-label="Primary"
      className="overalltext fixed inset-x-0 bottom-0 z-30 border-t border-custom-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(16,37,68,0.06)] backdrop-blur md:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {primary.map((item) => {
          const active = isActive(item);
          const Icon = active ? item.activeIcon : item.icon;
          return (
            <li key={item.to} className="min-w-0 flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center px-1 transition-colors",
                  active ? "text-primary" : "text-faded-grey",
                )}
              >
                <Icon className="size-[22px]" />
                {/* A tall line box: truncate clips to it, and Tibetan stacks
                    vowels and subjoined letters well above and below the
                    line, so a tight one cuts them off. */}
                <span
                  className={cn(
                    "w-full truncate text-center text-[11px] leading-[2]",
                    active && "font-semibold",
                  )}
                >
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AppBottomNav;
