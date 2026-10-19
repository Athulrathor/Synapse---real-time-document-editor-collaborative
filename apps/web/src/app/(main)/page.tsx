"use client";

import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { useUIStore } from "@/stores/ui.store";

export default function DashboardPage() {
  const openCreateWorkspace = useUIStore(
    (state) => state.openCreateWorkspace,
  );

  return (
    <div className="flex min-h-full">
      <AppSidebar />

      <div className="min-w-0 flex-1 p-5 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Your workspace
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Welcome back
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Continue where you left off.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateWorkspace}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="size-4" />
              New workspace
            </button>
          </section>
        </div>
      </div>

      <CreateWorkspaceDialog />
    </div>
  );
}