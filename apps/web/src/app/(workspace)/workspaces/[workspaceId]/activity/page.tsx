
"use client";

import { useGlobalActivity } from "@/hooks/use-activity";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Activity as ActivityIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

export function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-4">
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <Skeleton className="h-10 w-10 rounded-full" />

            {index !== 4 && (
              <Skeleton className="mt-2 h-14 w-px" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 space-y-3 pb-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}


export default function ActivityPage() {
  const { data, isPending, isError, refetch, isFetching } =
    useGlobalActivity(20);

  const activities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="w-full space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Activity
          </h1>

          <p className="text-sm text-muted-foreground">
            Track document changes, version history, and collaboration across
            your workspaces.
          </p>
        </div>

        {!isPending && !isError && activities.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        )}
      </header>

      {/* Loading */}
      {isPending && <ActivitySkeleton />}

      {/* Error */}
      {!isPending && isError && (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">Unable to load activity</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Something went wrong while fetching your activity. Please try
              again.
            </p>
          </div>

          <Button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Try again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isPending && !isError && activities.length === 0 && (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <ActivityIcon className="h-7 w-7 text-muted-foreground" />
          </div>

          <div className="space-y-1">
            <h2 className="font-semibold">No activity yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your workspace activity will appear here as you create documents,
              make changes, and collaborate with others.
            </p>
          </div>
        </div>
      )}

      {/* Activity content - next step */}
      {!isPending && !isError && activities.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {activities.length} {activities.length === 1 ? "activity" : "activities"}
          </p>

          {/* Timeline component will go here */}
          <ActivityTimeline activities={activities} />
        </div>
      )}
    </section>
  );
}
