"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/stores/auth-store-ui";
import { useYjsDocument } from "@/hooks/use-yjs-document";
import { useDocumentPresence } from "@/hooks/use-document-presence";
import { useYjsCollaboration } from "@/hooks/use-yjs-collaboration";

import type { Editor } from "@tiptap/react";
import { DocumentEditor } from "@/components/documents/editor/document-editor";
import { DocumentToolbar } from "@/components/documents/editor/editor-toolbar";
import { CollaboratorAvatars } from "@/components/documents/editor/collaborator-avatars";
import { TypingIndicator } from "@/components/documents/editor/typing-indicator";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Clock, CloudUpload } from "lucide-react";
import { ConnectionNotice } from "./connection-notice";
import { cn } from "cn";

interface EditorWorkspaceProps {
  documentId: string;
  title: string;
  content: Record<string, unknown> | null;
  // workspaceId: string;
  // workspaceName: string;
  // isFavorite: boolean;
  // onToggleFavorite: () => void;
  // onMoveToTrash: () => void;
}

interface SaveStatusProps {
  status: "saving" | "saved" | "error" | "idle";
  hasUnsavedChanges: boolean;
}

interface SaveStatusProps {
  status: "saving" | "saved" | "error" | "idle";
  hasUnsavedChanges: boolean;
}

type ConnectionNotice =
  | "connecting"
  | "synchronizing"
  | "connected"
  | "timeout"
  | "error";

const connectionLabels = {
  connecting: "Connecting...",
  connected: "Live",
  reconnecting: "Reconnecting...",
  disconnected: "Offline",
};

function SaveStatus({ status, hasUnsavedChanges }: SaveStatusProps) {
  const config = hasUnsavedChanges
    ? {
        label: "Unsaved changes",
        icon: Clock,
        className:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        iconClassName: "",
      }
    : {
        saving: {
          label: "Saving...",
          icon: CloudUpload,
          className: "border-primary/20 bg-primary/10 text-primary",
          iconClassName: "animate-pulse",
        },
        saved: {
          label: "Saved",
          icon: Check,
          className:
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          iconClassName: "",
        },
        error: {
          label: "Save failed",
          icon: AlertCircle,
          className: "border-destructive/20 bg-destructive/10 text-destructive",
          iconClassName: "",
        },
        idle: {
          label: "Ready",
          icon: Check,
          className: " bg-primary border-accent text-accent",
          iconClassName: "",
        },
      }[status];

  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={config.label}
        initial={{ opacity: 0, y: 4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        role="status"
        aria-live="polite"
        className={`inline-flex select-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${config.className}`}
      >
        <Icon className={`size-3.5 ${config.iconClassName}`} />
        <span>{config.label}</span>
      </motion.div>
    </AnimatePresence>
  );
}

export function EditorWorkspace({
  documentId,
  title,
  content,
  // workspaceId,
  // workspaceName,
  // isFavorite,
  // onToggleFavorite,
  // onMoveToTrash,
}: EditorWorkspaceProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const [notice, setNotice] = useState<ConnectionNotice>("connecting");
  const [retryCount, setRetryCount] = useState(0);

  const accessToken = useAuthStore((state) => state.accessToken);
  const authStatus = useAuthStore((state) => state.status);

  const enabled = authStatus === "authenticated" && Boolean(accessToken);

  const currentUserId = useAuthStore((state) => state.user?.id ?? "");

  const {
    ydoc,
    isLoaded: isLocalDocumentLoaded,
    error: localDocumentError,
  } = useYjsDocument({ documentId });

  const {
    presence,
    isConnected,
    error: presenceError,
    setStatus,
    setTyping,
    setCursor,
    cursorUpdates,
    retryJoin,
    isJoining,
    connectionStatus,
  } = useDocumentPresence({
    documentId,
    accessToken: enabled && accessToken ? accessToken : "",
    enabled,
  });

  const setCursorRef = useRef(setCursor);

  useEffect(() => {
    setCursorRef.current = setCursor;
  }, [setCursor]);

  const {
    isSynced,
    error: collaborationError,
    saveStatus,
    hasUnsavedChanges,
  } = useYjsCollaboration({
    documentId,
    accessToken: enabled && accessToken ? accessToken : "",
    ydoc,
    enabled: enabled && isLocalDocumentLoaded,
  });

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!editor || !isConnected || !isSynced) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;

      setCursorRef.current(from, to);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    // Publish the initial cursor position.
    handleSelectionUpdate();

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, isConnected, isSynced]);

  useEffect(() => {
    if (!editor || !isConnected || !isSynced) return;

    let typingTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleUpdate = () => {
      setTyping(true);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      typingTimeout = setTimeout(() => {
        setTyping(false);
      }, 1500);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);

      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      setTyping(false);
    };
  }, [editor, isConnected, isSynced, setTyping]);

  useEffect(() => {
    if (!editor || !isConnected || !isSynced) return;

    const handleFocus = () => {
      setStatus("editing");
    };

    const handleBlur = () => {
      setStatus("viewing");
      setTyping(false);
    };

    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);

      setStatus("viewing");
      setTyping(false);
    };
  }, [editor, isConnected, isSynced, setStatus, setTyping]);

  useEffect(() => {
    let noticeTimeout: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout>;

    if (isConnected && isSynced) {
      noticeTimeout = setTimeout(() => setNotice("connected"), 0);

      timeout = setTimeout(() => {
        setNotice((current) =>
          current === "connected" ? "connecting" : current,
        );
      }, 2000);

      return () => {
        clearTimeout(noticeTimeout);
        clearTimeout(timeout);
      };
    }

    const nextNotice = isConnected ? "synchronizing" : "connecting";
    noticeTimeout = setTimeout(() => setNotice(nextNotice), 0);

    timeout = setTimeout(() => {
      setNotice((current) => {
        if (current === "connecting" || current === "synchronizing") {
          return "timeout";
        }
        return current;
      });
    }, 15000);

    return () => {
      clearTimeout(noticeTimeout);
      clearTimeout(timeout);
    };
  }, [isConnected, isSynced, retryCount]);

  if (authStatus === "loading") {
    return <div className="flex-1 animate-pulse bg-muted" />;
  }

  if (authStatus !== "authenticated" || !accessToken) {
    return (
      <div className="flex flex-1 items-center justify-center">
        Authentication required.
      </div>
    );
  }

  if (localDocumentError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Unable to initialize local document storage: {localDocumentError}
      </div>
    );
  }

  if (!isLocalDocumentLoaded) {
    return <div className="flex-1 animate-pulse bg-muted" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <h3 className="mr-2">{title}</h3>

          <CollaboratorAvatars users={presence?.users ?? []} />

          <TypingIndicator
            users={presence?.users ?? []}
            currentUserId={currentUserId}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <SaveStatus
            status={saveStatus}
            hasUnsavedChanges={hasUnsavedChanges}
          />

          <span>
            {/* {isConnected ? (
              <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors dark:text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            ) : (
              <span className="inline-flex select-none items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors">
                <span className="relative inline-flex size-2 rounded-full bg-muted-foreground/50" />
                Offline
              </span>
            )} */}
            <span
              className={`flex items-center gap-2 text-xs px-2.5 py-1 rounded-4xl border ${connectionStatus === "connected" && "border-emerald-300 bg-emerald-500/10"}
            ${connectionStatus === "connecting" && "border-amber-300 bg-amber-500/10"}
            ${connectionStatus === "reconnecting" && "border-amber-300 bg-amber-500/10"}
            ${connectionStatus === "disconnected" && "border-muted-foreground bg-muted-foreground/10"}
             `}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  connectionStatus === "connected" && "bg-emerald-500",
                  connectionStatus === "connecting" &&
                    "animate-pulse bg-amber-500",
                  connectionStatus === "reconnecting" &&
                    "animate-pulse bg-amber-500",
                  connectionStatus === "disconnected" && "bg-muted-foreground",
                )}
              />
              {connectionLabels[connectionStatus]}
            </span>
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <DocumentToolbar editor={editor} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-0.5 bg-secondary mt-1 rounded-md">
        <DocumentEditor
          content={content}
          onChange={() => {
            // Collaborative changes are managed by Yjs.
          }}
          onEditorReady={setEditor}
          ydoc={ydoc}
          collaborative
          remoteCursors={cursorUpdates}
        />
      </div>

      {presenceError && (
        // <p className="px-4 py-2 text-xs text-destructive">
        //   Presence: {presenceError}
        // </p>
        <ConnectionNotice
          message={presenceError}
          isRetrying={isJoining}
          onRetry={retryJoin}
        />
      )}

      {collaborationError && (
        <p className="px-4 py-2 text-xs text-destructive">
          Collaboration: {collaborationError}
        </p>
      )}
    </div>
  );
}
