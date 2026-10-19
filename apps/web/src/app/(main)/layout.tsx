import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ProtectedRoute } from "@/components/auth/protected-route";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export default function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  return (
    <ProtectedRoute>
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <AppHeader />

      <main className="flex min-h-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
    </ProtectedRoute>
  );
}