import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
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
 */
export const SidebarLayout = () => (
  // data-app-shell switches off overscroll bounce for the page (App.css).
  <SidebarProvider defaultOpen={readSidebarOpen()} data-app-shell="">
    <AppSidebar />
    {/* Room at the bottom on a phone for the fixed tab bar (h-16). */}
    <div className="relative flex min-w-0 flex-1 flex-col bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <AppTopBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
    <AppBottomNav />
  </SidebarProvider>
);
