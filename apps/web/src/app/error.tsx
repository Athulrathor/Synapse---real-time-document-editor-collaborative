"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Synapse Workspace error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border bg-muted">
          <AlertTriangle className="size-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>

        <button
          onClick={reset}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
      </div>
    </main>
  );
}