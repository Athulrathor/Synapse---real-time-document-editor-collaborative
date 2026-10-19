
"use client";

import { useEffect } from "react";
import { Building2, FileText, LoaderCircle, RefreshCw, Users } from "lucide-react";

import { ApiError } from "@/apis/api-error";
// import { workspaceService } from "@/";
import { useWorkspaceUIStore } from "@/stores/workspace-ui.store";
import { workspaceService } from "@/apis/workspace-api";

export function WorkspaceOverview() {
  const workspaces = useWorkspaceUIStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceUIStore(
    (state) => state.activeWorkspaceId,
  );
  const isLoading = useWorkspaceUIStore((state) => state.isLoading);
  const error = useWorkspaceUIStore((state) => state.error);
  const setWorkspaces = useWorkspaceUIStore((state) => state.setWorkspaces);
  const setLoading = useWorkspaceUIStore((state) => state.setLoading);
  const setError = useWorkspaceUIStore((state) => state.setError);
  const setActiveWorkspace = useWorkspaceUIStore(
    (state) => state.setActiveWorkspace,
  );

  async function loadWorkspaces() {
    setLoading(true);
    setError(null);

    try {
      const data = await workspaceService.list();
      setWorkspaces(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load workspaces. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Your workspaces</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your documents and collaborate with your team.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadWorkspaces()}
          disabled={isLoading}
          aria-label="Refresh workspaces"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border hover:bg-muted disabled:opacity-50"
        >
          {isLoading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4"
        >
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => void loadWorkspaces()}
            className="text-sm font-medium underline"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading && workspaces.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading workspaces...
        </div>
      ) : !error && workspaces.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Building2 className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold">No workspaces yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create a workspace to start organizing documents and collaborating.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => {
            const isActive = activeWorkspaceId === workspace.id;

            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => setActiveWorkspace(workspace.id)}
                aria-pressed={isActive}
                className={`rounded-2xl border p-5 text-left transition-colors hover:bg-muted/50 ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Building2 className="size-5" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {workspace.members[0]?.role ?? "MEMBER"}
                  </span>
                </div>

                <h3 className="mt-4 truncate font-semibold">
                  {workspace.name}
                </h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {workspace.description || "No description added."}
                </p>

                <div className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
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
