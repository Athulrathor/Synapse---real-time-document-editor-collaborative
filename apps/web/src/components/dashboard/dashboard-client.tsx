"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Clock3,
  FileText,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react";

import { useWorkspaces } from "@/hooks/use-workspace";
import { useDocumentsAcrossWorkspaces } from "@/hooks/use-document";

export function DashboardClient() {
  const { data: workspaces = [], isPending: workspacesLoading } =
    useWorkspaces();

  const workspaceIds = useMemo(
    () => workspaces.map((workspace) => workspace.id),
    [workspaces],
  );

  const { documents, isLoading: documentsLoading } =
    useDocumentsAcrossWorkspaces(workspaceIds, 1, 5);

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .filter((document) => document.status === "ACTIVE")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [documents],
  );

  const dashboardWorkspaces = useMemo(
    () => workspaces.slice(0, 4),
    [workspaces],
  );

  const totalDocuments = workspaces.reduce(
    (total, workspace) => total + workspace._count.documents,
    0,
  );

  const totalMembers = workspaces.reduce(
    (total, workspace) => total + workspace._count.members,
    0,
  );

  const isLoading = workspacesLoading || documentsLoading;

  const stats = [
    {
      label: "Total Documents",
      value: totalDocuments,
      icon: FileText,
      description: "Across all workspaces",
    },
    {
      label: "Workspaces",
      value: workspaces.length,
      icon: FolderKanban,
      description: "Your accessible workspaces",
    },
    {
      label: "Team Members",
      value: totalMembers,
      icon: Users,
      description: "Combined workspace memberships",
    },
    {
      label: "Recent Documents",
      value: recentDocuments.length,
      icon: Clock3,
      description: "Latest active documents",
    },
  ];

  return (
    <div className="mx-auto w-full space-y-8">
      {/* Welcome */}
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage your documents and collaborate with your team.
          </p>
        </div>

        {/* <Link
          href="/workspaces"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          Create Workspace
        </Link> */}
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="min-w-0 rounded-xl border bg-card p-2.5 shadow-sm sm:p-4 lg:p-5"
            >
              <div className="flex min-w-0 items-center justify-between gap-1">
                <p className="min-w-0 truncate text-[10px] font-medium text-muted-foreground sm:text-xs lg:text-sm">
                  {stat.label}
                </p>

                <div className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary sm:p-2">
                  <Icon className="size-3.5 sm:size-4 lg:size-5" />
                </div>
              </div>

              <p className="mt-3 truncate text-xl font-bold tabular-nums sm:mt-4 sm:text-2xl lg:text-3xl">
                {isLoading ? "—" : stat.value}
              </p>

              <p className="mt-1 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px] lg:text-xs">
                {stat.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Recent Documents */}
      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-semibold">Recent Documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue working on your latest documents.
            </p>
          </div>

          <Link
            href={`/workspaces/${documents[0]?.workspaceId}/documents`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading documents...
            </div>
          ) : recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="rounded-xl bg-primary/10 p-4 text-primary">
                <FileText className="size-7" />
              </div>

              <h3 className="mt-4 font-semibold">No documents yet</h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Create your first document to get started.
              </p>

              <Link
                href="/workspaces"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Explore workspaces <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            recentDocuments.map((document) => {
              const workspace = workspaces.find(
                (item) => item.id === document.workspaceId,
              );

              return (
                <Link
                  key={document.id}
                  href={`/workspaces/${document.workspaceId}/documents/${document.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 sm:px-5"
                >
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <FileText className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {document.title}
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {workspace?.name ?? "Workspace"}
                    </p>
                  </div>

                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </span>

                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Workspaces */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Your Workspaces</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your collaborative spaces.
            </p>
          </div>

          <Link
            href="/workspace"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardWorkspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}/documents`}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <FolderKanban className="size-5" />
                </div>

                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>

              <h3 className="mt-4 truncate font-semibold">{workspace.name}</h3>

              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {workspace.description || "No description available"}
              </p>

              <div className="mt-4 flex items-center gap-4 border-t pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  {workspace._count.documents} documents
                </span>

                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {workspace._count.members} members
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
