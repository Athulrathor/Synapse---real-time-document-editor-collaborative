export type ActivityType =
  | "DOCUMENT_CREATED"
  | "DOCUMENT_UPDATED"
  | "VERSION_RESTORED"
  | "DOCUMENT_ARCHIVED"
  | "DOCUMENT_RESTORED"
  | "DOCUMENT_DELETED"
  | "DOCUMENT_PERMANENTLY_DELETED"
  | "DOCUMENT_SHARED"
  | "COMMENT_ADDED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED";

export interface ActivityActor {
  id: string;
  name: string;
  avatar: {
    id: string;
    name: string;
    path: string;
  };
}

export interface ActivityWorkspace {
  id: string;
  name: string;
}

export interface ActivityMetadata {
  documentTitle?: string;
  versionNumber?: number;
  versionMessage?: string;
  restoredFromVersion?: number;
  source?: "ARCHIVE" | "TRASH";
  [key: string]: unknown;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorId: string;
  workspaceId: string;
  documentId: string | null;
  versionId: string | null;
  metadata: ActivityMetadata | null;
  createdAt: string;
  actor: ActivityActor;
  workspace: ActivityWorkspace;
}

export interface PaginatedActivity {
  items: ActivityItem[];
  nextCursor: string | null;
  hasMore: boolean;
}