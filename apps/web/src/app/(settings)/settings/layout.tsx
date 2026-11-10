import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SettingsSidebar } from "@/components/layout/sidebars/settings-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsRouteBreadcrumbs } from "@/components/shared/settings-route-breadcrumbs";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <SidebarProvider className="flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
          <AppHeader />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <SettingsSidebar />

            <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <SettingsRouteBreadcrumbs />
              <main className="h-full min-h-0 w-full max-w-7xl overflow-y-auto workspace-scrollbar py-4 sm:px-2 px-3 mx-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ProtectedRoute>
  );
}