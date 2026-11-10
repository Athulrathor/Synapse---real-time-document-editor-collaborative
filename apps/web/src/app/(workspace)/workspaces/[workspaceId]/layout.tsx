import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { WorkspacesSidebar } from "@/components/layout/sidebars/workspaces-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceRouteBreadcrumbs } from "@/components/shared/workspace-route-breadcrumbs";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <SidebarProvider className="flex h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
          <AppHeader />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <WorkspacesSidebar />

            <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {/* <div className="py-4 sm:px-0 px-3 mx-auto"> */}
                <WorkspaceRouteBreadcrumbs  />
              {/* </div> */}
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
