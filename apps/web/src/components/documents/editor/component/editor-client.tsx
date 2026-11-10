"use client";

import { EditorWorkspace } from "@/components/documents/editor/component/editor-workspace";
import {
  useDocument
} from "@/hooks/use-document";

interface EditorClientProps {
  workspaceId: string;
  documentId: string;
}

export function EditorClient({ documentId }: EditorClientProps) {
  const {
    data: document,
    isPending,
    isError,
    error,
    refetch,
  } = useDocument(documentId);

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
        <div className="flex-1 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Unable to load this document.</p>

        <p className="text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."}
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <section className="flex min-h-0 w-full flex-1 flex-col">
      <EditorWorkspace
        key={documentId}
        documentId={documentId}
        title={document.title}
        content={document.content}
      />
    </section>
  );
}
