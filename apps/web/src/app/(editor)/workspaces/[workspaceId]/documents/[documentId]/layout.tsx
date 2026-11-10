import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppHeader } from "@/components/layout/app-header";
import { EditorRouteBreadcrumbs } from "@/components/shared/editor-route-breadcrumbs";

interface EditorLayoutProps {
  children: ReactNode;
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <ProtectedRoute>
      <AppHeader  />
      <EditorRouteBreadcrumbs />
      <main className="h-full min-h-0 w-full max-w-7xl overflow-y-auto workspace-scrollbar py-4 sm:max-2xl:px-4 px-2 mx-auto">
        {children}
      </main>
    </ProtectedRoute>
  );
}