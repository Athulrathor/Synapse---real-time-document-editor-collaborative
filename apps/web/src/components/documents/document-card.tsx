"use client";

import Link from "next/link";
import { FileText, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import type { DocumentItem } from "@/types/document.type";
// import { Toaster } from "@/components/ui/sonner";

function formatDistanceToNow(date: Date) {
  const seconds = (date.getTime() - Date.now()) / 1000;
  const absoluteSeconds = Math.abs(seconds);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = seconds;
  let divisor = 1;
  for (const [limit, unit] of units) {
    value = Math.round(seconds / divisor);
    if (absoluteSeconds / divisor < limit || unit === "year") {
      return new Intl.RelativeTimeFormat(undefined, {
        numeric: "always",
      }).format(value, unit);
    }
    divisor *= limit;
  }

  return "";
}

interface DocumentCardProps {
  document: DocumentItem;
  isStarred?: boolean;
}

export function DocumentCard({
  document,
  isStarred = false,
}: DocumentCardProps) {
  // const starMutation = useStarDocument();
  // const unstarMutation = useUnstarDocument();

  // const isPending =
    // starMutation.isPending || unstarMutation.isPending;

  function handleToggleStar(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    // const mutation = isStarred ? unstarMutation : starMutation;

    // mutation.mutate(document.id, {
    //   onSuccess: () => {
    //     // toast.success(
    //     //   isStarred
    //     //     ? "Document removed from starred"
    //     //     : "Document added to starred",
    //     // );
    //   },
    //   // onError: () => {
    //   //   toast.error("Unable to update starred document");
    //   // },
    // });
  }

  return (
    <Card className="group transition-colors hover:border-primary/40">
      <CardContent className="flex items-start gap-3 p-4">
        <Link
          href={`document/${document.id}`}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">
              {document.title || "Untitled document"}
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Updated{" "}
              {formatDistanceToNow(new Date(document.updatedAt))}
            </p>
          </div>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          // disabled={isPending}
          aria-label={
            isStarred ? "Unstar document" : "Star document"
          }
          aria-pressed={isStarred}
          onClick={handleToggleStar}
          className="size-9 shrink-0"
        >
          <Star
            className={`size-4 ${
              isStarred
                ? "fill-yellow-400 text-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        </Button>
      </CardContent>
    </Card>
  );
}