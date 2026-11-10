"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardHeroProps {
  userName?: string;
  isLoading?: boolean;
  onCreateDocument?: () => void;
}

export function DashboardHero({
  userName = "there",
  isLoading = false,
  onCreateDocument,
}: DashboardHeroProps) {
  if (isLoading) {
    return (
      <Card className="w-full min-w-0 border-border/60 shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>

          <Skeleton className="h-11 w-full rounded-md sm:w-36" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden border-border/60 shadow-none">
    <CardContent className="flex w-full min-w-0 flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-7">
      <div className="w-full min-w-0 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Good morning, {userName}
          <span aria-hidden="true"> 👋</span>
        </h1>

        <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Your workspace, ideas, and documents — all in one place.
        </p>
      </div>

      <Button
        type="button"
        onClick={onCreateDocument}
        className="h-11 w-full shrink-0 gap-2 sm:w-auto"
      >
        <Plus className="size-4" aria-hidden="true" />
        New Document
      </Button>
    </CardContent>
  </Card>
  );
}