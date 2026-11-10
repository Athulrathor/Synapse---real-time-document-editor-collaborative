"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  FilePlus2,
  FilePenLine,
  RotateCcw,
  Archive,
  Trash2,
  Share2,
  MessageSquare,
  Pencil,
  Trash,
  Users,
  ArrowUpRight,
} from "lucide-react";

import { ActivityItem, ActivityType } from "@/types/activity.type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatActivityDate(date: string) {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return "Unknown date";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 0) return new Date(date).toLocaleString();
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const activityConfig: Record<
  ActivityType,
  { label: string; icon: typeof Activity }
> = {
  DOCUMENT_CREATED: { label: "Created a document", icon: FilePlus2 },
  DOCUMENT_UPDATED: { label: "Updated a document", icon: FilePenLine },
  VERSION_RESTORED: { label: "Restored a document version", icon: RotateCcw },
  DOCUMENT_ARCHIVED: { label: "Archived a document", icon: Archive },
  DOCUMENT_RESTORED: { label: "Restored a document", icon: RotateCcw },
  DOCUMENT_DELETED: { label: "Moved a document to trash", icon: Trash2 },
  DOCUMENT_PERMANENTLY_DELETED: {
    label: "Permanently deleted a document",
    icon: Trash,
  },
  DOCUMENT_SHARED: { label: "Shared a document", icon: Share2 },
  COMMENT_ADDED: { label: "Added a comment", icon: MessageSquare },
  COMMENT_UPDATED: { label: "Updated a comment", icon: Pencil },
  COMMENT_DELETED: { label: "Deleted a comment", icon: Trash2 },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const router = useRouter();

  if (activities.length === 0) return null;

  return (
    <div className="relative">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        const metadata = activity.metadata;

        const title = metadata?.documentTitle || "Untitled document";

        const contributorIds = Array.isArray(metadata?.contributorIds)
          ? metadata.contributorIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [];

        const contributorCount = new Set(contributorIds).size;
        const isClickable = Boolean(activity.documentId);

        return (
          <div key={activity.id} className="group relative flex gap-4">
            {/* Timeline column */}
            <div className="flex w-10 shrink-0 flex-col items-center">
              <Avatar className="relative z-10 h-10 w-10 border bg-background">
                <AvatarImage
                  src={activity.actor.avatar?.path || undefined}
                  alt={activity.actor.name}
                />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(activity.actor.name)}
                </AvatarFallback>
              </Avatar>

              {index !== activities.length - 1 && (
                <div className="my-2 w-px flex-1 bg-border transition-colors group-hover:bg-primary/40" />
              )}
            </div>

            {/* Activity content */}
            <div className="min-w-0 flex-1 pb-7">
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold">
                  {activity.actor.name}
                </span>

                <span className="text-sm text-muted-foreground">
                  {config.label}
                </span>

                <span className="text-xs text-muted-foreground">
                  · {formatActivityDate(activity.createdAt)}
                </span>
              </div>

              <button
                type="button"
                disabled={!isClickable}
                onClick={() => {
                  if (activity.documentId) {
                    router.push(
                      `/workspaces/${activity.workspaceId}/documents/${activity.documentId}`,
                    );
                  }
                }}
                className={`w-full rounded-lg border bg-card p-3 text-left transition-all ${
                  isClickable
                    ? "cursor-pointer hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    : "cursor-default opacity-80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">{title}</p>

                    <p className="text-xs text-muted-foreground">
                      in {activity.workspace.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {metadata?.versionNumber != null && (
                        <Badge variant="secondary">
                          Version {metadata.versionNumber}
                        </Badge>
                      )}

                      {metadata?.restoredFromVersion != null && (
                        <Badge variant="outline">
                          Restored from v{metadata.restoredFromVersion}
                        </Badge>
                      )}

                      {contributorCount > 1 && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {contributorCount} contributors
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isClickable && (
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
