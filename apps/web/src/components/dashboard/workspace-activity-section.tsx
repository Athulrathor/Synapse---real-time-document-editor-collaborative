import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FilePlus2,
  FileText,
  Pencil,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export interface WorkspaceActivityItem {
  id: string;
  action: string;
  actorName: string;
  documentId?: string | null;
  documentTitle?: string | null;
  createdAt: string;
}

interface WorkspaceActivityProps {
  activities: WorkspaceActivityItem[];
  isLoading?: boolean;
}

const activityIcons: Record<
  string,
  typeof Activity
> = {
  DOCUMENT_CREATED: FilePlus2,
  DOCUMENT_UPDATED: Pencil,
  DOCUMENT_DELETED: FileText,
  MEMBER_ADDED: Users,
};

export function WorkspaceActivity({
  activities,
  isLoading = false,
}: WorkspaceActivityProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">
            Workspace Activity
          </CardTitle>

          <CardDescription>
            Recent activity across your workspace.
          </CardDescription>
        </div>

        <Activity
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />

                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="mb-3 rounded-full bg-muted p-3">
              <Activity className="size-5 text-muted-foreground" />
            </div>

            <p className="text-sm font-medium">No recent activity</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Workspace events appear&lsquo;s here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {activities.map((item) => {
              const Icon =
                activityIcons[item.action] ?? Activity;

              const content = (
                <div className="flex min-w-0 gap-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted/40"
                  >
                    <Icon
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words text-sm leading-5">
                      <span className="font-medium">
                        {item.actorName}
                      </span>{" "}
                      {formatAction(item.action)}{" "}
                      {item.documentTitle && (
                        <span className="font-medium">
                          {item.documentTitle}
                        </span>
                      )}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              );

              return (
                <div key={item.id}>
                  {item.documentId ? (
                    <Link
                      href={`/documents/${item.documentId}`}
                      className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && activities.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-between"
            >
              <Link href="/activity">
                View activity
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    DOCUMENT_CREATED: "created",
    DOCUMENT_UPDATED: "updated",
    DOCUMENT_DELETED: "deleted",
    MEMBER_ADDED: "added a workspace member",
  };

  return labels[action] ?? action.toLowerCase().replaceAll("_", " ");
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(timestamp);
}