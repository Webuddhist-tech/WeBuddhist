import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import AppSidebar from "../routes/navbar/sidebar/AppSidebar";
import AppTopBar from "../routes/navbar/sidebar/AppTopBar";
import AppBottomNav from "../routes/navbar/sidebar/AppBottomNav";
import AppFooter from "../routes/footer/AppFooter";

/**
 * Whether the sidebar was left open last visit. The sidebar writes this
 * cookie every time it is toggled but never reads it back, so the shell
 * does that here.
 */
const readSidebarOpen = () =>
  !document.cookie.split("; ").includes("sidebar_state=false");

/**
 * App-style shell: navigation in a collapsible sidebar on the left, the page
 * (with a slim search/account bar above it) on the right.
 *
 * `reader` is for the full-height readers (chapter, sheet editor): no
 * footer, and the page gets exactly the space between the top bar and the
 * phone's tab bar, scrolling inside it, so a reader sized `h-full` fits
 * the screen instead of sliding under the sticky bar.
 */
export const SidebarLayout = ({ reader = false }: { reader?: boolean }) => (
  // data-app-shell switches off overscroll bounce for the page (App.css).
  <SidebarProvider defaultOpen={readSidebarOpen()} data-app-shell="">
    <AppSidebar />
    {/* Room at the bottom on a phone for the fixed tab bar (h-16). */}
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
        reader && "h-dvh",
      )}
    >
      <AppTopBar />
      <main className={cn("flex-1", reader && "min-h-0 overflow-y-auto")}>
        <Outlet />
      </main>
      {!reader && <AppFooter />}
    </div>
    <AppBottomNav />
  </SidebarProvider>
);
