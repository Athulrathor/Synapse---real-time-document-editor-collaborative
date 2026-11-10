export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export interface DocumentItem {
  id: string;
  workspaceId: string;
  title: string;
  status: DocumentStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDocuments {
  items: DocumentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  message: string | null;
  createdById: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    avatar: {
      path: string;
    } | null;
  };
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  workspaceId: string;
  content: unknown | null;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdById: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title?: string;
  content?: Record<string, unknown>;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: Record<string, unknown>;
}

export interface DocumentDetails extends DocumentItem {
  content: Record<string, unknown> | null;

  workspace: {
    id: string;
    name: string;
  };

  createdBy: {
    id: string;
    name: string;
    email?: string;
    avatar: {
      path: string;
      id?: string;
      fileId?: string;
    } | null;
  };
}

export interface DocumentMutationResult extends DocumentItem {
  content?: Record<string, unknown> | null;
}

export interface DocumentRecentView {
  lastViewedAt: string;
  document: {
    id: string;
    title: string;
    workspaceId: string;
    updatedAt: string;
    createdById: string;
  };
}

export interface DocumentStarredItem {
  createdAt: string;
  document: {
    id: string;
    title: string;
    workspaceId: string;
    workspace: {
      id: string;
      name: string;
    };
    updatedAt: string;
    createdById: string;
  };
}

export interface DocumentTrashItem {
  id: string;
  title: string;
  workspaceId: string;
  status: "DELETED";
  deletedAt: string;
  updatedAt: string;
  createdById: string;
  workspace: {
    id: string;
    name: string;
  };
}
