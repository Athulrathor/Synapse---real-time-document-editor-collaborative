"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { workspaceService } from "@/apis/workspace-api";

import type {
  CreateWorkspaceInvitationInput,
  WorkspaceInvitationTokenInput,
  WorkspaceRole,
} from "@/types/workspace.type";

export const workspaceKeys = {
  all: ["workspaces"] as const,

  lists: () => [...workspaceKeys.all, "list"] as const,

  detail: (workspaceId: string) =>
    [...workspaceKeys.all, "detail", workspaceId] as const,

  invitations: (workspaceId: string) =>
    [...workspaceKeys.all, "invitations", workspaceId] as const,
};

// Get all workspaces
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: () => workspaceService.list(),
    staleTime: 60 * 1000,
  });
}

// Get workspace details
export function useWorkspaceDetail(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceService.getById(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });
}

// Get workspace invitations
export function useWorkspaceInvitations(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.invitations(workspaceId),
    queryFn: () => workspaceService.getInvitations(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateWorkspaceMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      workspaceService.updateMemberRole(workspaceId, userId, role),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });

      queryClient.invalidateQueries({
        queryKey: workspaceKeys.lists(),
      });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeMember(workspaceId, userId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });

      queryClient.invalidateQueries({
        queryKey: workspaceKeys.lists(),
      });
    },
  });
}

// Send invitation
export function useSendWorkspaceInvitation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInvitationInput) =>
      workspaceService.sendInvitation(workspaceId, input),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}

// Revoke invitation
export function useRevokeWorkspaceInvitation(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      workspaceService.revokeInvitation(workspaceId, invitationId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}

// Accept invitation
export function useAcceptWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WorkspaceInvitationTokenInput) =>
      workspaceService.acceptInvitation(input),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.all,
      });
    },
  });
}

// Reject invitation
export function useRejectWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WorkspaceInvitationTokenInput) =>
      workspaceService.rejectInvitation(input),
  });
}
