import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { GlobalSidebar } from "@/components/layout/sidebars/global-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteBreadcrumbs } from "@/components/layout/route-breadcrumbs";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <SidebarProvider className="flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
          <AppHeader />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <GlobalSidebar />

            <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <RouteBreadcrumbs />
              <main className="h-full min-h-0 w-full max-w-7xl overflow-y-auto workspace-scrollbar py-4 sm:max-2xl:px-4 px-2 mx-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ProtectedRoute>
  );
}