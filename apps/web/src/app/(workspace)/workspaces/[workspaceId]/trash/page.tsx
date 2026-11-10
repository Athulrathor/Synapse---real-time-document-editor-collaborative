
"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  FileText,
  RotateCcw,
  Trash2,
  Clock3,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useTrashDocuments,
  useRestoreFromTrash,
  usePermanentlyDeleteDocument,
} from "@/hooks/use-document";

export default function TrashPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("DELETED_DESC");

  const {
    data: trashDocuments = [],
    isPending,
    isError,
    refetch,
  } = useTrashDocuments();

  const restoreMutation = useRestoreFromTrash();
  const permanentlyDeleteMutation = usePermanentlyDeleteDocument();

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...trashDocuments]
      .filter((document) => {
        return (
          document.title.toLowerCase().includes(query) ||
          document.workspace.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case "TITLE_ASC":
            return a.title.localeCompare(b.title);

          case "DELETED_ASC":
            return (
              new Date(a.deletedAt ?? 0).getTime() -
              new Date(b.deletedAt ?? 0).getTime()
            );

          case "DELETED_DESC":
          default:
            return (
              new Date(b.deletedAt ?? 0).getTime() -
              new Date(a.deletedAt ?? 0).getTime()
            );
        }
      });
  }, [trashDocuments, search, sort]);

  const handleRestore = (documentId: string) => {
    restoreMutation.mutate(documentId);
  };

  const handlePermanentDelete = (
    documentId: string,
    title: string,
  ) => {
    const confirmed = window.confirm(
      `Permanently delete "${title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    permanentlyDeleteMutation.mutate(documentId);
  };

  if (isPending) {
    return (
      <section className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-5">
                <Skeleton className="size-10 rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-destructive">
            Failed to load Trash. Please try again.
          </p>

          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Trash
        </h1>

        <p className="text-sm text-muted-foreground">
          Deleted documents across all your workspaces.
          Permanently deleted documents cannot be recovered.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search trash..."
            className="pl-9"
          />
        </div>

        <div className="relative sm:w-52">
          <ArrowUpDown className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
          >
            <option value="DELETED_DESC">Recently deleted</option>
            <option value="DELETED_ASC">Oldest deleted</option>
            <option value="TITLE_ASC">Title (A–Z)</option>
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-muted p-4">
              <Trash2 className="size-8 text-muted-foreground" />
            </div>

            <h3 className="font-semibold">
              {search ? "No matching documents" : "Trash is empty"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {search
                ? "Try another search term."
                : "Documents you delete will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((document) => (
            <Card key={document.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="w-fit rounded-lg bg-muted p-2">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>

                  <span className="text-xs text-muted-foreground">
                    Deleted
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-medium">
                    {document.title}
                  </h3>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {document.workspace.name}
                  </p>

                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {document.deletedAt
                      ? `Deleted ${new Date(
                          document.deletedAt,
                        ).toLocaleDateString()}`
                      : "Deletion date unavailable"}
                  </p>
                </div>

                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={
                      restoreMutation.isPending ||
                      permanentlyDeleteMutation.isPending
                    }
                    onClick={() => handleRestore(document.id)}
                  >
                    <RotateCcw className="mr-2 size-4" />
                    Restore
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={
                      restoreMutation.isPending ||
                      permanentlyDeleteMutation.isPending
                    }
                    onClick={() =>
                      handlePermanentDelete(
                        document.id,
                        document.title,
                      )
                    }
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete forever
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
