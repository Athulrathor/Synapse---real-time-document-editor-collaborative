import { API_ENDPOINTS } from "@/apis/api-endpoint";
import { apiRequest } from "@/apis/api-client";

import type {
  Workspace,
  CreateWorkspaceInput,
  WorkspaceInvitation,
  CreateWorkspaceInvitationInput,
  WorkspaceInvitationTokenInput,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.type";

export const workspaceService = {
  list(): Promise<Workspace[]> {
    return apiRequest<Workspace[]>(API_ENDPOINTS.workspaces.list);
  },

  create(input: CreateWorkspaceInput): Promise<Workspace> {
    return apiRequest<Workspace>(API_ENDPOINTS.workspaces.create, {
      method: "POST",
      json: input,
    });
  },

  getById(workspaceId: string): Promise<Workspace> {
    return apiRequest<Workspace>(API_ENDPOINTS.workspaces.detail(workspaceId));
  },

  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    return apiRequest<WorkspaceMember>(
      API_ENDPOINTS.workspaces.member(workspaceId, userId),
      {
        method: "PATCH",
        json: { role },
      },
    );
  },

  removeMember(workspaceId: string, userId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.workspaces.member(workspaceId, userId), {
      method: "DELETE",
    });
  },

  // Send invitation
  sendInvitation(
    workspaceId: string,
    input: CreateWorkspaceInvitationInput,
  ): Promise<WorkspaceInvitation> {
    return apiRequest<WorkspaceInvitation>(
      API_ENDPOINTS.workspaces.invitations(workspaceId),
      {
        method: "POST",
        json: input,
      },
    );
  },

  // Get workspace invitations
  getInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return apiRequest<WorkspaceInvitation[]>(
      API_ENDPOINTS.workspaces.invitations(workspaceId),
    );
  },

  // Revoke invitation
  revokeInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitation> {
    return apiRequest<WorkspaceInvitation>(
      API_ENDPOINTS.workspaces.revokeInvitation(workspaceId, invitationId),
      {
        method: "DELETE",
      },
    );
  },

  // Accept invitation
  acceptInvitation(input: WorkspaceInvitationTokenInput) {
    return apiRequest(API_ENDPOINTS.workspaces.acceptInvitation, {
      method: "POST",
      json: input,
    });
  },

  // Reject invitation
  rejectInvitation(input: WorkspaceInvitationTokenInput) {
    return apiRequest(API_ENDPOINTS.workspaces.rejectInvitation, {
      method: "POST",
      json: input,
    });
  },
};
