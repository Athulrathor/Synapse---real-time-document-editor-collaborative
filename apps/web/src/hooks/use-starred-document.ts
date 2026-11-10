// "use client";

// import {
//   useMutation,
//   useQuery,
//   useQueryClient,
// } from "@tanstack/react-query";

// import { documentService } from "@/apis/document-api";

// const starredDocumentKeys = {
//   all: ["documents", "starred"] as const,
// };

// export function useStarredDocuments() {
//   return useQuery({
//     queryKey: starredDocumentKeys.all,
//     queryFn: () => documentService.getStarred(),
//     staleTime: 30_000,
//     retry: 1,
//   });
// }

// export function useStarDocument() {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: (documentId: string) =>
//       documentService.starDocument(documentId),

//     onSuccess: async () => {
//       await queryClient.invalidateQueries({
//         queryKey: starredDocumentKeys.all,
//       });
//     },
//   });
// }

// export function useUnstarDocument() {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: (documentId: string) =>
//       documentService.unstarDocument(documentId),

//     onSuccess: async () => {
//       await queryClient.invalidateQueries({
//         queryKey: starredDocumentKeys.all,
//       });
//     },
//   });
// }