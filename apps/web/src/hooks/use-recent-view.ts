// "use client";

// import { useQuery } from "@tanstack/react-query";
// import { documentService } from "@/apis/document-api"

// export function useRecentlyViewed() {
//   return useQuery({
//     queryKey: ["documents", "recently-viewed"],
//     queryFn: () => documentService.(),
//     staleTime: 30_000,
//     retry: 1,
//   });
// }