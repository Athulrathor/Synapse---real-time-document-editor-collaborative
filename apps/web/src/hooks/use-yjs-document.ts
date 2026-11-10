"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

interface UseYjsDocumentOptions {
  documentId: string;
}

interface UseYjsDocumentReturn {
  ydoc: Y.Doc;
  isLoaded: boolean;
  error: string | null;
}

export function useYjsDocument({
  documentId,
}: UseYjsDocumentOptions): UseYjsDocumentReturn {
  const [ydoc] = useState(() => new Y.Doc());
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let persistence: IndexeddbPersistence | null = null;

    try {
      persistence = new IndexeddbPersistence(
        `synapse-document:${documentId}`,
        ydoc,
      );

      persistence.on("synced", () => {
        if (!active) return;
        setIsLoaded(true);
        setError(null);
      });

      persistence.on("error", (cause: Error) => {
        if (!active) return;
        setError(cause.message);
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Unable to initialize local document storage.";

      queueMicrotask(() => {
        if (active) setError(message);
      });
    }

    return () => {
      active = false;
      persistence?.destroy();
      ydoc.destroy();
    };
  }, [documentId, ydoc]);

  return { ydoc, isLoaded, error };
}