"use client";

import Link from "next/link";
import { FolderKanban, Plus, Users, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface DashboardWorkspace {
  id: string;
  name: string;
  description?: string | null;
  role: string;
  memberCount: number;
  updatedAt: string;
}

interface WorkspaceOverviewProps {
  workspaces: DashboardWorkspace[];
  isLoading?: boolean;
  onCreateWorkspace?: () => void;
}

export function WorkspaceOverview({
  workspaces,
  isLoading = false,
  onCreateWorkspace,
}: WorkspaceOverviewProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">
            Your Workspaces
          </CardTitle>

          <CardDescription>
            Collaborate with your team in shared spaces.
          </CardDescription>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={onCreateWorkspace}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create workspace</span>
          <span className="sm:hidden">Create</span>
        </Button>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />

                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>

                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <FolderKanban className="size-6 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                No workspaces yet
              </p>

              <p className="text-sm text-muted-foreground">
                Create a workspace to start collaborating.
              </p>
            </div>

            <Button
              size="sm"
              onClick={onCreateWorkspace}
            >
              <Plus className="size-4" />
              Create workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspaces/${workspace.id}`}
                className="group min-w-0 rounded-lg border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {workspace.name}
                      </h3>

                      <Badge
                        variant="secondary"
                        className="mt-1 text-xs capitalize"
                      >
                        {workspace.role.toLowerCase()}
                      </Badge>
                    </div>
                  </div>

                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>

                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {workspace.description || "No description provided."}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="size-3.5" />

                  <span>
                    {workspace.memberCount}{" "}
                    {workspace.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}