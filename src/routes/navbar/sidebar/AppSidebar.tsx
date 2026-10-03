import { Link } from "react-router-dom";
import { useTranslate } from "@tolgee/react";
import { IoChevronBack, IoChevronDown, IoGlobeOutline } from "react-icons/io5";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavItems, type NavItem } from "./navItems.ts";
import { useSiteLanguage } from "./useSiteLanguage.ts";

/**
 * Rows share one look whether they are links or buttons: a soft grey pill
 * behind the active page, like the reading apps this shell is modelled on.
 * Spelled out here rather than through the sidebar tokens because the
 * phone drawer is portalled to <body>, out of reach of any token override
 * set on the layout.
 */
const ROW_CLASS =
  "h-9 gap-3 rounded-lg px-2.5 text-[0.9rem] text-faded-grey hover:bg-search-background hover:text-primary data-[active=true]:bg-search-background data-[active=true]:font-semibold data-[active=true]:text-primary [&>svg]:size-[18px]";

/**
 * The left-hand navigation of the sidebar shell: brand at the top, the
 * site's sections in the middle, the language picker pinned to the bottom.
 *
 * On a wide screen it collapses to an icon rail (labels move into
 * tooltips); on a phone it is a drawer the top bar's menu button opens.
 */
const AppSidebar = () => {
  const { t } = useTranslate();
  const { primary, secondary, isActive } = useNavItems();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  // A tap on a phone should land on the page, not leave the drawer over it.
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item)}
            tooltip={item.label}
            className={ROW_CLASS}
          >
            <Link to={item.to} onClick={closeOnMobile}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="overalltext border-custom-border [--sidebar:var(--navbar)]"
    >
      <SidebarHeader className="h-[60px] flex-row items-center justify-between px-3 group-data-[collapsible=icon]:px-2">
        {isCollapsed ? (
          // The rail has no room for the wordmark, so the mark doubles as
          // the button that opens the sidebar back up.
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t("header.expand_sidebar", "Expand sidebar")}
            title={t("header.expand_sidebar", "Expand sidebar")}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-search-background"
          >
            <img src="/img/logo.png" alt="Webuddhist" className="size-6" />
          </button>
        ) : (
          <>
            <Link to="/" onClick={closeOnMobile} className="flex items-center">
              <img
                src="/img/light_mode_logo.svg"
                alt="Webuddhist"
                className="h-[28px]"
              />
            </Link>
            {!isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t("header.collapse_sidebar", "Collapse sidebar")}
                title={t("header.collapse_sidebar", "Collapse sidebar")}
                className="flex size-7 items-center justify-center rounded-md border border-custom-border text-faded-grey transition-colors hover:bg-search-background hover:text-primary"
              >
                <IoChevronBack className="size-3.5" />
              </button>
            )}
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup className="px-3 group-data-[collapsible=icon]:px-2">
          {renderItems(primary)}
        </SidebarGroup>
        <SidebarSeparator className="mx-5 w-auto bg-custom-border group-data-[collapsible=icon]:mx-3" />
        <SidebarGroup className="px-3 group-data-[collapsible=icon]:px-2">
          {renderItems(secondary)}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4 group-data-[collapsible=icon]:px-2">
        <LanguageMenu isCollapsed={isCollapsed} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

/** The bottom-left language picker; on the icon rail it is just the globe. */
const LanguageMenu = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { t } = useTranslate();
  const { languages, current, select } = useSiteLanguage();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={current.label}
              aria-label={t("header.change_language", "Change language")}
              className={cn(ROW_CLASS, "text-sm")}
            >
              <IoGlobeOutline />
              <span>{current.label}</span>
              {!isCollapsed && <IoChevronDown className="ml-auto size-3" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-40">
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
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default AppSidebar;
