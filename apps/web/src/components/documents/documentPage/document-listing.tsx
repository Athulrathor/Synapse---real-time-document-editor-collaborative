"use client";

import { useRouter, usePathname } from "next/navigation";
import { FileText, MoreHorizontal, Star, Trash2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  useStarredDocuments,
  useStarDocument,
  useUnstarDocument,
  useDeleteDocument,
  useWorkspaceDocuments,
  useSearchDocuments,
} from "@/hooks/use-document";
import { useState } from "react";

function DocumentsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-5 w-12" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-7 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface DocumentListingProps {
  workspaceId: string;
  search: string;
  status: string;
  sort: string;
}

export default function DocumentListing({
  workspaceId,
  search,
  status,
  sort,
}: DocumentListingProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isSearching = search.trim().length > 0;
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const pageKey = JSON.stringify([search, workspaceId]);
  const page = pageState.key === pageKey ? pageState.page : 1;
  const limit = 20;

  // Workspace listing
  const workspaceQuery = useWorkspaceDocuments(workspaceId, page, limit);
  const pagination = workspaceQuery.data?.pagination;

  // Global search
  const searchQuery = useSearchDocuments(search);

  const { data: starredDocuments } = useStarredDocuments();

  const starDocument = useStarDocument();
  const unstarDocument = useUnstarDocument();
  const deleteDocument = useDeleteDocument();

  const isPending = isSearching
    ? searchQuery.isPending
    : workspaceQuery.isPending;

  const isError = isSearching ? searchQuery.isError : workspaceQuery.isError;

  const sourceDocuments = isSearching
    ? (searchQuery.data ?? []).filter(
        (document) => document.workspaceId === workspaceId,
      )
    : (workspaceQuery.data?.items ?? []);

  const filteredDocuments = sourceDocuments
    .filter((document) =>
      status === "ALL" ? true : document.status === status,
    )
    .sort((a, b) => {
      switch (sort) {
        case "UPDATED_ASC":
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          );

        case "TITLE_ASC":
          return a.title.localeCompare(b.title);

        case "TITLE_DESC":
          return b.title.localeCompare(a.title);

        case "UPDATED_DESC":
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });

  if (isPending) {
    return <DocumentsSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">
            Failed to load documents. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (filteredDocuments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-xl bg-muted p-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>

          <h3 className="font-semibold">
            {isSearching ? "No matching documents" : "No documents yet"}
          </h3>

          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {isSearching
              ? "Try another search term."
              : "Create your first document to get started."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredDocuments.map((document) => (
          <Card
            key={document.id}
            className="cursor-pointer transition-colors hover:bg-muted/40"
            onClick={() => router.push(`${pathname}/${document.id}`)}
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-primary/10 p-2 w-fit">
                  <FileText className="size-5 text-primary" />
                </div>

                <div className="flex items-center gap-1">
                  {(() => {
                    const isFavorite =
                      starredDocuments?.some(
                        (item) => item.document.id === document.id,
                      ) ?? false;

                    return (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title={
                          isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        onClick={(event) => {
                          event.stopPropagation();

                          if (isFavorite) {
                            unstarDocument.mutate(document.id);
                          } else {
                            starDocument.mutate(document.id);
                          }
                        }}
                      >
                        <Star
                          className={`size-4 ${
                            isFavorite ? "fill-yellow-400 text-yellow-500" : ""
                          }`}
                        />
                      </Button>
                    );
                  })()}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          if (!window.confirm("Move this document to Trash?"))
                            return;

                          deleteDocument.mutate(document.id);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Move to Trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-medium">{document.title}</h3>

                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {new Date(document.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!isSearching && pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
            <span className="ml-2">({pagination.total} documents)</span>
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPageState({ key: pageKey, page: page - 1 })}
            >
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPageState({ key: pageKey, page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
