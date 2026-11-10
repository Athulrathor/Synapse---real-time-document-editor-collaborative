import { apiRequest } from "@/apis/api-client";
import { API_ENDPOINTS } from "@/apis/api-endpoint";

import type {
  CreateDocumentInput,
  DocumentDetails,
  DocumentSearchResult,
  DocumentStarredItem,
  DocumentTrashItem,
  DocumentVersion,
  PaginatedDocuments,
  UpdateDocumentInput,
} from "@/types/document.type";

export const documentService = {
  // Get workspace documents
  listByWorkspace(
    workspaceId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedDocuments> {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return apiRequest<PaginatedDocuments>(
      `${API_ENDPOINTS.document.listByWorkspace(workspaceId)}?${query}`,
    );
  },

  // Create document
  create(
    workspaceId: string,
    input: CreateDocumentInput,
  ): Promise<DocumentDetails> {
    return apiRequest<DocumentDetails>(
      API_ENDPOINTS.document.create(workspaceId),
      {
        method: "POST",
        json: input,
      },
    );
  },

  // Get document details
  getById(documentId: string): Promise<DocumentDetails> {
    return apiRequest<DocumentDetails>(
      API_ENDPOINTS.document.detail(documentId),
    );
  },

  // Search documents
  search(query: string, signal: AbortSignal): Promise<DocumentSearchResult[]> {
    const params = new URLSearchParams({ q: query });

    return apiRequest<DocumentSearchResult[]>(
      `${API_ENDPOINTS.document.search}?${params}`,
      { signal },
    );
  },

  // Update document
  update(
    documentId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetails> {
    return apiRequest<DocumentDetails>(
      API_ENDPOINTS.document.update(documentId),
      {
        method: "PATCH",
        json: input,
      },
    );
  },

  // Star document
  star(documentId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.document.star(documentId), {
      method: "POST",
    });
  },

  // Unstar document
  unstar(documentId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.document.star(documentId), {
      method: "DELETE",
    });
  },

  // Get document versions
  getVersions(documentId: string): Promise<DocumentVersion[]> {
    return apiRequest<DocumentVersion[]>(
      API_ENDPOINTS.document.versions(documentId),
    );
  },

  // Get document versions
  listVersions(documentId: string): Promise<DocumentVersion[]> {
    return apiRequest<DocumentVersion[]>(
      API_ENDPOINTS.document.versions(documentId),
    );
  },

  // Delete document
  delete(documentId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.document.delete(documentId), {
      method: "DELETE",
    });
  },

  getStarred(): Promise<DocumentStarredItem[]> {
    return apiRequest<DocumentStarredItem[]>(API_ENDPOINTS.document.starred);
  },

  // Archive document
  archive(documentId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.document.archive(documentId), {
      method: "PATCH",
    });
  },

  // Restore archived document
  restore(documentId: string): Promise<unknown> {
    return apiRequest(API_ENDPOINTS.document.restore(documentId), {
      method: "PATCH",
    });
  },

  getTrash(): Promise<DocumentTrashItem[]> {
    return apiRequest<DocumentTrashItem[]>(API_ENDPOINTS.document.trash);
  },

  restoreFromTrash(documentId: string) {
    return apiRequest(API_ENDPOINTS.document.restoreFromTrash(documentId), {
      method: "PATCH",
    });
  },

  permanentlyDelete(documentId: string) {
    return apiRequest(API_ENDPOINTS.document.permanentlyDelete(documentId), {
      method: "DELETE",
    });
  },

  // Restore document version
  restoreVersion(documentId: string, versionNumber: number): Promise<unknown> {
    return apiRequest(
      API_ENDPOINTS.document.restoreVersion(documentId, versionNumber),
      {
        method: "POST",
      },
    );
  },
};
