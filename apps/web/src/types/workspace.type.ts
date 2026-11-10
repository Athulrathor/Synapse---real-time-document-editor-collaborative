export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;

  members: {
    role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
    joinedAt: string;
    userId: string;
  }[];

  _count: {
    members: number;
    documents: number;
  };
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export type WorkspaceInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  invitedById: string;
  invitedUserId: string | null;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInvitationInput {
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
}

export interface WorkspaceInvitationTokenInput {
  token: string;
}

export type WorkspaceRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: {
      path: string;
    } | null;
  };
}

export interface WorkspaceDetails {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members: WorkspaceMember[];
  _count: {
    members: number;
    documents: number;
  };
}