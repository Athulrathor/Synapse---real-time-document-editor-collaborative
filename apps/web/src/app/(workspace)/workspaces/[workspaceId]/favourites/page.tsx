
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Star,
  ArrowUpDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useStarredDocuments,
  useUnstarDocument,
} from "@/hooks/use-document";

export default function FavouritesPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("STARRED_DESC");

  const { data: favourites = [], isPending, isError, refetch } =
    useStarredDocuments();

  const unstarMutation = useUnstarDocument();

  const filteredFavourites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...favourites]
      .filter(({ document }) => {
        return (
          document.title.toLowerCase().includes(query) ||
          document.workspace.name.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case "TITLE_ASC":
            return a.document.title.localeCompare(b.document.title);

          case "UPDATED_DESC":
            return (
              new Date(b.document.updatedAt).getTime() -
              new Date(a.document.updatedAt).getTime()
            );

          case "STARRED_DESC":
          default:
            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            );
        }
      });
  }, [favourites, search, sort]);

  const openDocument = (workspaceId: string, documentId: string) => {
    router.push(
      `/workspaces/${workspaceId}/documents/${documentId}`,
    );
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
            Failed to load favourites. Please try again.
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
          Favourites
        </h1>
        <p className="text-sm text-muted-foreground">
          Your favourite documents across all workspaces.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search favourites..."
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
            <option value="STARRED_DESC">Recently added</option>
            <option value="UPDATED_DESC">Recently updated</option>
            <option value="TITLE_ASC">Title (A–Z)</option>
          </select>
        </div>
      </div>

      {filteredFavourites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-xl bg-muted p-4">
              <Star className="size-8 text-muted-foreground" />
            </div>

            <h3 className="font-semibold">
              {search ? "No matching favourites" : "No favourites yet"}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {search
                ? "Try another search term."
                : "Documents you mark as favourites will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFavourites.map(({ document }) => (
            <Card
              key={document.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() =>
                openDocument(document.workspaceId, document.id)
              }
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="w-fit rounded-lg bg-primary/10 p-2">
                    <FileText className="size-5 text-primary" />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={unstarMutation.isPending}
                    aria-label={`Remove ${document.title} from favourites`}
                    onClick={(event) => {
                      event.stopPropagation();
                      unstarMutation.mutate(document.id);
                    }}
                  >
                    <Star className="size-4 fill-yellow-400 text-yellow-500" />
                  </Button>
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-medium">
                    {document.title}
                  </h3>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {document.workspace.name}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(document.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
