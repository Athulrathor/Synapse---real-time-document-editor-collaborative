"use client";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RecentDocument {
  id: string;
  title: string;
  workspaceName: string;
  updatedAt: string;
}

interface RecentDocumentsProps {
  documents: RecentDocument[];
  isLoading?: boolean;
  onCreateDocument?: () => void;
}

export function RecentDocuments({
  documents,
  isLoading = false,
  onCreateDocument,
}: RecentDocumentsProps) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">
            Recent Documents
          </CardTitle>

          <CardDescription>
            Continue working on your documents.
          </CardDescription>
        </div>

        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/documents">
            View all
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg p-3"
            >
              <Skeleton className="size-10 shrink-0 rounded-md" />

              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <FileText className="size-6 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                No documents yet
              </p>

              <p className="text-sm text-muted-foreground">
                Create a document to get started.
              </p>
            </div>

            {onCreateDocument && (
              <Button
                type="button"
                size="sm"
                onClick={onCreateDocument}
              >
                <Plus className="mr-2 size-4" />
                Create document
              </Button>
            )}
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="group flex min-w-0 items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
                <FileText
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>

              <Link
                href={`/documents/${document.id}`}
                className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate text-sm font-medium">
                  {document.title}
                </p>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {document.workspaceName}
                  {" · "}
                  {formatUpdatedAt(document.updatedAt)}
                </p>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label={`Actions for ${document.title}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/documents/${document.id}`}>
                      Open document
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}