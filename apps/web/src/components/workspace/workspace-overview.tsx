"use client";

import { useState } from "react";
import {
  Building2,
  FileText,
  LayoutGrid,
  List,
  RefreshCw,
  Users,
} from "lucide-react";

import { useWorkspaces } from "@/hooks/use-workspace";
// import { useWorkspaceUIStore } from "@/stores/workspace-ui.store";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { useParams, useRouter } from "next/navigation"

type ViewMode = "grid" | "list";

function WorkspaceSkeleton({ view }: { view: ViewMode }) {
  return (
    <div
      className={
        view === "grid"
          ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          : "space-y-3"
      }
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className={
            view === "grid"
              ? "rounded-2xl border p-5"
              : "flex items-center gap-4 rounded-xl border p-4"
          }
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />

          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full max-w-xs" />

            {view === "grid" && (
              <Skeleton className="mt-5 h-3 w-1/2" />
            )}
          </div>

          {view === "list" && (
            <div className="hidden gap-4 sm:flex">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function WorkspaceOverview() {
  const [view, setView] = useState<ViewMode>("grid");

  const router = useRouter();
  const { activeWorkspaceId } = useParams();

  const {
    data: workspaces = [],
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useWorkspaces();

  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unable to load workspaces. Please try again.";

  const selectWorkspace = (workspaceId: string) => {
    // setWorkspaces(workspaces);
    // setActiveWorkspace(workspaceId);
    router.push(`workspaces/${workspaceId}/documents`);
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh workspaces"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>

          <div className="flex items-center rounded-lg border p-1">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
            >
              <LayoutGrid className="size-4" />
            </Button>

            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4"
        >
          <p className="text-sm text-destructive">{errorMessage}</p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Loading */}
      {isPending ? (
        <WorkspaceSkeleton view={view} />
      ) : !isError && workspaces.length === 0 ? (
        /* Empty state */
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>

          <h3 className="mt-4 font-semibold">No workspaces yet</h3>

          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create a workspace to start organizing documents and collaborating.
          </p>
        </div>
      ) : (
        /* Workspace collection */
        <div
          className={
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          }
        >
          {workspaces.map((workspace) => {
            const isActive = activeWorkspaceId === workspace.id;

            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => selectWorkspace(workspace.id)}
                aria-pressed={isActive}
                className={`w-full rounded-2xl border text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                } ${
                  view === "grid"
                    ? "p-5"
                    : "flex flex-wrap items-center gap-4 p-4"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Building2 className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">
                        {workspace.name}
                      </h3>

                      {view === "list" && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {workspace.members[0]?.role ?? "MEMBER"}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {workspace.description || "No description added."}
                    </p>
                  </div>
                </div>

                {view === "grid" && (
                  <div className="mt-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {workspace.members[0]?.role ?? "MEMBER"}
                    </span>
                  </div>
                )}

                <div
                  className={`flex shrink-0 items-center gap-4 text-xs text-muted-foreground ${
                    view === "grid"
                      ? "mt-5 border-t border-border pt-4"
                      : "ml-14 sm:ml-0"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {workspace._count.members} members
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    {workspace._count.documents} documents
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}