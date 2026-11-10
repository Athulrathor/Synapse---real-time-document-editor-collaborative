"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from "@/types/document.type";
import { documentService } from "@/apis/document-api";

/* -------------------------------------------------------------------------- */
/* Query Keys                                                                 */
/* -------------------------------------------------------------------------- */

const documentKeys = {
  all: ["documents"] as const,

  byWorkspace: (workspaceId: string) =>
    ["documents", "workspace", workspaceId] as const,

  lists: (workspaceId: string) =>
    [...documentKeys.byWorkspace(workspaceId), "list"] as const,

  list: (workspaceId: string, page: number, limit: number) =>
    [...documentKeys.lists(workspaceId), { page, limit }] as const,

  details: () => ["documents", "detail"] as const,

  detail: (documentId: string) =>
    [...documentKeys.details(), documentId] as const,

  versions: (documentId: string) =>
    ["documents", "versions", documentId] as const,

  search: () => ["documents", "search"] as const,

  searchQuery: (query: string) => [...documentKeys.search(), query] as const,
  starred: () => [...documentKeys.all, "starred"] as const,
  trash: () => [...documentKeys.all, "trash"] as const,
};

export { documentKeys };

// READ: List documents in a workspace.
export function useWorkspaceDocuments(
  workspaceId: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: documentKeys.list(workspaceId, page, limit),
    queryFn: () => documentService.listByWorkspace(workspaceId, page, limit),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}

// READ: Fetch documents across multiple workspaces.
export function useDocumentsAcrossWorkspaces(
  workspaceIds: string[],
  page = 1,
  limit = 100,
) {
  const uniqueWorkspaceIds = [...new Set(workspaceIds)].sort();

  const queries = useQueries({
    queries: uniqueWorkspaceIds.map((workspaceId) => ({
      queryKey: documentKeys.list(workspaceId, page, limit),
      queryFn: () => documentService.listByWorkspace(workspaceId, page, limit),
      enabled: Boolean(workspaceId),
      staleTime: 60_000,
    })),
  });

  return {
    documents: queries.flatMap((query) => query.data?.items ?? []),
    isLoading: queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    errors: queries
      .map((query) => query.error)
      .filter((error) => error !== null),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

// READ: Fetch one document.
export function useDocument(documentId: string) {
  return useQuery({
    queryKey: documentKeys.detail(documentId),
    queryFn: () => documentService.getById(documentId),
    enabled: Boolean(documentId),
    staleTime: 60_000,
  });
}

// READ: Fetch a document's version history.
export function useDocumentVersions(documentId: string) {
  return useQuery({
    queryKey: documentKeys.versions(documentId),
    queryFn: () => documentService.listVersions(documentId),
    enabled: Boolean(documentId),
    staleTime: 60_000,
  });
}

// READ: Search documents.
export function useSearchDocuments(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: documentKeys.searchQuery(normalizedQuery),

    queryFn: ({ signal }) => documentService.search(normalizedQuery, signal),

    enabled: normalizedQuery.length > 0,
    staleTime: 30_000,
  });
}

// Shared invalidation helper.
function invalidateDocumentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: documentKeys.all,
    }),
  ]);
}

// CREATE: Create a document inside a workspace.
export function useCreateDocument(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentInput) =>
      documentService.create(workspaceId, data),

    onSuccess: async (document) => {
      queryClient.setQueryData(documentKeys.detail(document.id), document);

      await invalidateDocumentQueries(queryClient);
    },
  });
}

// UPDATE: Update a document's title or content.
export function useUpdateDocument(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDocumentInput) =>
      documentService.update(documentId, data),

    onSuccess: (updatedDocument) => {
      // Update the existing detail cache without immediately
      // triggering a refetch that could overwrite the response.
      queryClient.setQueryData(
        documentKeys.detail(documentId),
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          return {
            ...previous,
            ...updatedDocument,
          };
        },
      );

      // Update matching cached workspace document lists.
      queryClient.setQueriesData(
        {
          queryKey: documentKeys.all,
        },
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          const data = previous as {
            items?: Array<Record<string, unknown>>;
          };

          if (!Array.isArray(data.items)) {
            return previous;
          }

          return {
            ...data,
            items: data.items.map((item) =>
              item.id === updatedDocument.id
                ? { ...item, ...updatedDocument }
                : item,
            ),
          };
        },
      );
    },
  });
}

// DELETE: Soft-delete a document.
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => documentService.delete(documentId),

    onSuccess: async (_, documentId) => {
      queryClient.removeQueries({
        queryKey: documentKeys.detail(documentId),
        exact: true,
      });

      await invalidateDocumentQueries(queryClient);
    },
  });
}

// ARCHIVE: Archive a document.
export function useArchiveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => documentService.archive(documentId),

    onSuccess: async (document, documentId) => {
      queryClient.setQueryData(
        documentKeys.detail(documentId),
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          return {
            ...previous,
            ...(document && typeof document === "object" ? document : {}),
          };
        },
      );

      await invalidateDocumentQueries(queryClient);
    },
  });
}

// RESTORE: Restore an archived document.
export function useRestoreDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => documentService.restore(documentId),

    onSuccess: async (document, documentId) => {
      queryClient.setQueryData(
        documentKeys.detail(documentId),
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          return {
            ...previous,
            ...(document && typeof document === "object" ? document : {}),
          };
        },
      );

      await invalidateDocumentQueries(queryClient);
    },
  });
}

// RESTORE VERSION: Restore historical content as a new version.
export function useRestoreDocumentVersion(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionNumber: number) =>
      documentService.restoreVersion(documentId, versionNumber),

    onSuccess: async (restoredDocument) => {
      // Fetch the full document because restoreVersion does not
      // return workspace and creator relations.
      queryClient.setQueryData(
        documentKeys.detail(documentId),
        (previous: unknown) => {
          if (!previous || typeof previous !== "object") {
            return previous;
          }

          return {
            ...previous,
            ...(restoredDocument && typeof restoredDocument === "object"
              ? restoredDocument
              : {}),
          };
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: documentKeys.detail(documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentKeys.versions(documentId),
        }),
        queryClient.invalidateQueries({
          queryKey: documentKeys.all,
        }),
      ]);
    },
  });
}

// READ: Fetch starred documents across all accessible workspaces.
export function useStarredDocuments() {
  return useQuery({
    queryKey: documentKeys.starred(),
    queryFn: () => documentService.getStarred(),
    staleTime: 60_000,
  });
}

// UNSTAR: Remove a document from favourites.
export function useUnstarDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => documentService.unstar(documentId),

    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function useTrashDocuments() {
  return useQuery({
    queryKey: documentKeys.trash(),
    queryFn: () => documentService.getTrash(),
    staleTime: 60_000,
  });
}

export function useRestoreFromTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.restoreFromTrash(documentId),

    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

export function usePermanentlyDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.permanentlyDelete(documentId),

    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}

// STAR: Add a document to favourites.
export function useStarDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      documentService.star(documentId),

    onSuccess: async () => {
      await invalidateDocumentQueries(queryClient);
    },
  });
}
