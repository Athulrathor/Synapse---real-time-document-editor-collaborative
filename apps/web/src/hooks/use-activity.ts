"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { activityService } from "@/apis/activity-api";

const activityKeys = {
  all: ["activity"] as const,
  global: (limit: number) => ["activity", "global", limit] as const,
};

export { activityKeys };

export function useGlobalActivity(limit = 20) {
  return useInfiniteQuery({
    queryKey: activityKeys.global(limit),

    queryFn: ({ pageParam, signal }) =>
      activityService.getGlobalActivity(
        limit,
        pageParam,
        signal,
      ),

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,

    staleTime: 30_000,
  });
}