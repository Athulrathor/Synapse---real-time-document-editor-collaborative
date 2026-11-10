"use client";

import { useWorkspaces } from "@/hooks/use-workspace";
import { useNotifications } from "@/hooks/use-notifications";

export function useDashboard() {
  const workspacesQuery = useWorkspaces();
  const notifications = useNotifications();

  const workspaces = workspacesQuery.data ?? [];

  const uniqueMemberIds = new Set(
    workspaces.flatMap((workspace) =>
      workspace.members.map((member) => member.userId),
    ),
  );

  const stats = {
    totalWorkspaces: workspaces.length,

    totalDocuments: workspaces.reduce(
      (total, workspace) => total + workspace._count.documents,
      0,
    ),

    uniqueMembers: uniqueMemberIds.size,

    totalMemberships: workspaces.reduce(
      (total, workspace) => total + workspace.members.length,
      0,
    ),

    unreadNotifications: notifications.unreadCount,
  };

  return {
    stats,
    workspaces: workspaces.slice(0, 6),

    isLoading:
      workspacesQuery.isPending || notifications.isLoading,

    isError:
      workspacesQuery.isError || notifications.isError,

    refetchWorkspaces: workspacesQuery.refetch,
    refetchNotifications: notifications.refetch,
  };
}