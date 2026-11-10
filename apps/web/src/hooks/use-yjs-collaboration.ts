"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import type { Socket } from "socket.io-client";

import { getSocketClient } from "@/libs/socket-client";

export type DocumentSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseYjsCollaborationOptions {
  documentId: string;
  accessToken: string;
  ydoc: Y.Doc;
  enabled?: boolean;
}

interface UseYjsCollaborationReturn {
  isSynced: boolean;
  error: string | null;
  saveStatus: DocumentSaveStatus;
  hasUnsavedChanges: boolean;
}

interface SyncStatePayload {
  documentId: string;
  requestId: string;
  state: Uint8Array | ArrayBuffer | number[];
}

interface CollaborationUpdatePayload {
  documentId: string;
  update: Uint8Array | ArrayBuffer | number[];
}

interface CollaborationAct {
  success?: boolean;
  message?: string;
  requestId?: string;
  initialized?: boolean;
  data?: {
    success?: boolean;
    message?: string;
    requestId?: string;
    initialized?: boolean;
  };
}

const SYNC_MAX_ATTEMPTS = 5;
const SYNC_ACK_TIMEOUT_MS = 8000;
const SYNC_INITIAL_RETRY_DELAY_MS = 1000;
const SYNC_MAX_RETRY_DELAY_MS = 8000;

const MAX_PENDING_UPDATES = 1000;
const UPDATE_ACK_TIMEOUT_MS = 8000;
const UPDATE_MAX_ATTEMPTS = 5;
const UPDATE_INITIAL_RETRY_DELAY_MS = 1000;
const UPDATE_MAX_RETRY_DELAY_MS = 8000;

const getActionResult = (
  response: CollaborationAct | undefined,
): CollaborationAct | undefined => {
  if (!response) return undefined;

  if (response.data) {
    return {
      ...response.data,
      success: response.data.success ?? response.success,
      message: response.data.message ?? response.message,
      requestId: response.data.requestId ?? response.requestId,
    };
  }
  console.log(
    "[Yjs] Reconciliation acknowledgement:",
    JSON.stringify(response, null, 2),
  );
  return response;
};

function toUint8Array(
  value:
    | Uint8Array
    | ArrayBuffer
    | number[]
    | { type: "Buffer"; data: number[] },
): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "Buffer" &&
    "data" in value &&
    Array.isArray(value.data)
  ) {
    return new Uint8Array(value.data);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  throw new TypeError("Unsupported Yjs update payload format");
}

export function useYjsCollaboration({
  documentId,
  accessToken,
  ydoc,
  enabled = true,
}: UseYjsCollaborationOptions): UseYjsCollaborationReturn {
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<DocumentSaveStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isSyncedRef = useRef(false);

  useEffect(() => {
    isSyncedRef.current = isSynced;
  }, [isSynced]);

  const resetVisibleSyncState = useCallback(() => {
    isSyncedRef.current = false;
    setIsSynced(false);
    setSaveStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!enabled || !documentId || !accessToken) {
      isSyncedRef.current = false;
      const resetTimer = setTimeout(resetVisibleSyncState, 0);
      return () => clearTimeout(resetTimer);
    }

    const socket: Socket = getSocketClient(accessToken);

    let active = true;
    let joined = false;
    let syncInFlight = false;
    let applyingRemoteUpdate = false;

    let syncAttempt = 0;
    let syncGeneration = 0;
    let syncRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let syncAckTimer: ReturnType<typeof setTimeout> | undefined;
    let syncStateTimer: ReturnType<typeof setTimeout> | undefined;

    const pendingUpdates: Uint8Array[] = [];

    let isFlushingUpdates = false;
    let updateRequestId = 0;
    let updateRetryAttempt = 0;
    let updateRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let updateAckTimer: ReturnType<typeof setTimeout> | undefined;
    let activeSyncRequestId: string | null = null;

    const isValidDocument = (id: string) => active && id === documentId;

    const clearSyncTimers = () => {
      if (syncRetryTimer !== undefined) {
        clearTimeout(syncRetryTimer);
        syncRetryTimer = undefined;
      }

      if (syncAckTimer !== undefined) {
        clearTimeout(syncAckTimer);
        syncAckTimer = undefined;
      }

      if (syncStateTimer !== undefined) {
        clearTimeout(syncStateTimer);
        syncStateTimer = undefined;
      }
    };

    const clearUpdateTimers = () => {
      if (updateRetryTimer) clearTimeout(updateRetryTimer);
      if (updateAckTimer) clearTimeout(updateAckTimer);

      updateRetryTimer = undefined;
      updateAckTimer = undefined;
    };

    const resetSyncAttempt = () => {
      clearSyncTimers();
      syncGeneration += 1;
      syncInFlight = false;
      syncAttempt = 0;
      activeSyncRequestId = null;
    };

    const resetUpdateAttempt = () => {
      clearUpdateTimers();
      updateRequestId += 1;
      isFlushingUpdates = false;
      updateRetryAttempt = 0;
    };

    const scheduleSyncRetry = (message: string) => {
      if (!active || !joined || !socket.connected) return;

      syncInFlight = false;
      activeSyncRequestId = null;
      // Invalidate callbacks belonging to the failed synchronization attempt.
      syncGeneration += 1;

      if (syncAckTimer) {
        clearTimeout(syncAckTimer);
        syncAckTimer = undefined;
      }

      if (syncStateTimer) {
        clearTimeout(syncStateTimer);
        syncStateTimer = undefined;
      }

      if (syncRetryTimer) {
        clearTimeout(syncRetryTimer);
        syncRetryTimer = undefined;
      }

      if (syncAttempt >= SYNC_MAX_ATTEMPTS) {
        setError(
          `${message} Automatic synchronization retries exhausted. Reopen the document to retry.`,
        );
        return;
      }

      const delay = Math.min(
        SYNC_INITIAL_RETRY_DELAY_MS * 2 ** Math.max(0, syncAttempt - 1),
        SYNC_MAX_RETRY_DELAY_MS,
      );

      setError(
        `${message} Retrying synchronization in ${Math.ceil(delay / 1000)}s…`,
      );

      syncRetryTimer = setTimeout(() => {
        syncRetryTimer = undefined;
        requestSync();
      }, delay);
    };

    const flushPendingUpdates = () => {
      if (
        !active ||
        !joined ||
        !socket.connected ||
        !isSyncedRef.current ||
        isFlushingUpdates ||
        updateRetryTimer ||
        pendingUpdates.length === 0
      ) {
        return;
      }

      isFlushingUpdates = true;

      const update = pendingUpdates[0];
      const requestId = ++updateRequestId;

      const retryUpdate = (message: string) => {
        if (!active || requestId !== updateRequestId) return;

        if (updateAckTimer) clearTimeout(updateAckTimer);
        updateAckTimer = undefined;

        isFlushingUpdates = false;

        if (updateRetryAttempt >= UPDATE_MAX_ATTEMPTS) {
          setSaveStatus("error");
          setError(
            `${message} Pending changes are still queued and have not been confirmed as saved.`,
          );
          return;
        }

        const delay = Math.min(
          UPDATE_INITIAL_RETRY_DELAY_MS * 2 ** updateRetryAttempt,
          UPDATE_MAX_RETRY_DELAY_MS,
        );

        updateRetryAttempt += 1;

        setError(`${message} Retrying save in ${Math.ceil(delay / 1000)}s…`);

        updateRetryTimer = setTimeout(() => {
          updateRetryTimer = undefined;
          flushPendingUpdates();
        }, delay);
      };

      updateAckTimer = setTimeout(() => {
        retryUpdate("Saving a document update timed out.");
      }, UPDATE_ACK_TIMEOUT_MS);

      socket.emit(
        "collaboration:update",
        { documentId, update },
        (response: CollaborationAct) => {
          if (!active || requestId !== updateRequestId || !isFlushingUpdates) {
            return;
          }

          if (updateAckTimer) clearTimeout(updateAckTimer);
          updateAckTimer = undefined;

          const result = getActionResult(response);

          if (!result?.success) {
            retryUpdate(result?.message ?? "Unable to save a document update.");
            return;
          }

          // Remove only the update acknowledged by the server.
          pendingUpdates.shift();

          updateRetryAttempt = 0;
          isFlushingUpdates = false;
          setError(null);

          if (pendingUpdates.length === 0) {
            setHasUnsavedChanges(false);
            setSaveStatus("saved");
          } else {
            setHasUnsavedChanges(true);
            setSaveStatus("saving");
          }

          // if (pendingUpdates.length === 0) {
          //   setSaveStatus("saved");
          // } else {
          //   setSaveStatus("saving");
          // }

          // Continue in order, one update at a time.
          flushPendingUpdates();
        },
      );
    };

    const requestSync = () => {
      if (
        !active ||
        !joined ||
        !socket.connected ||
        syncInFlight ||
        isSyncedRef.current ||
        syncRetryTimer
      ) {
        return;
      }

      clearSyncTimers();

      syncInFlight = true;
      syncAttempt += 1;

      const generation = ++syncGeneration;

      const isCurrentSync = () =>
        active && joined && generation === syncGeneration && syncInFlight;

      const handleSyncTimeout = () => {
        if (!isCurrentSync()) return;

        syncInFlight = false;
        scheduleSyncRetry("The document synchronization timed out.");
      };

      syncAckTimer = setTimeout(handleSyncTimeout, SYNC_ACK_TIMEOUT_MS);
      const requestId = crypto.randomUUID();
      activeSyncRequestId = requestId;

      socket.emit(
        "collaboration:sync-request",
        { documentId, requestId },
        (response: CollaborationAct) => {
          if (!isCurrentSync()) return;

          if (syncAckTimer) clearTimeout(syncAckTimer);
          syncAckTimer = undefined;

          const result = getActionResult(response);

          if (!result?.success) {
            syncInFlight = false;
            scheduleSyncRetry(
              result?.message ?? "Unable to synchronize the document.",
            );
            return;
          }

          // The acknowledgement confirms request acceptance only.
          // Wait separately for collaboration:sync-state.
          syncStateTimer = setTimeout(handleSyncTimeout, SYNC_ACK_TIMEOUT_MS);
        },
      );
    };

    const handleConnect = () => {
      joined = false;
      resetSyncAttempt();
      resetUpdateAttempt();

      isSyncedRef.current = false;
      setIsSynced(false);
      setError(null);

      // The presence hook is responsible for joining the document room.
    };

    const handleDisconnect = () => {
      joined = false;
      resetSyncAttempt();
      resetUpdateAttempt();

      isSyncedRef.current = false;
      setIsSynced(false);

      // Keep pendingUpdates intact so queued changes can be retried
      // after the room is joined and synchronization completes.
    };

    const handleJoined = (payload: { documentId?: string }) => {
      if (!isValidDocument(payload?.documentId ?? "")) return;

      joined = true;
      resetSyncAttempt();

      isSyncedRef.current = false;
      setIsSynced(false);
      setError(null);

      requestSync();
    };

    const handleSyncState = (payload: SyncStatePayload) => {
      if (
        !isValidDocument(payload?.documentId ?? "") ||
        payload.documentId !== documentId ||
        !active ||
        !joined ||
        !syncInFlight ||
        !activeSyncRequestId ||
        payload.requestId !== activeSyncRequestId
      ) {
        return;
      }

      // The initial server response has arrived.
      // Stop its timeout before starting reconciliation.
      if (syncAckTimer !== undefined) {
        clearTimeout(syncAckTimer);
        syncAckTimer = undefined;
      }

      if (syncStateTimer !== undefined) {
        clearTimeout(syncStateTimer);
        syncStateTimer = undefined;
      }

      const initialRequestId = payload.requestId;
      const currentGeneration = syncGeneration;

      const isCurrentAttempt = () =>
        active &&
        joined &&
        syncInFlight &&
        currentGeneration === syncGeneration &&
        activeSyncRequestId === initialRequestId;

      let acknowledgementReceived = false;
      let acknowledgementTimer: ReturnType<typeof setTimeout> | undefined;

      try {
        const serverState = toUint8Array(payload.state);

        if (serverState.byteLength === 0) {
          throw new Error("Received an empty server Yjs state.");
        }

        // Merge server history into the existing document.
        // Do not replace or recreate the existing Y.Doc.
        applyingRemoteUpdate = true;

        try {
          Y.applyUpdate(ydoc, serverState, "remote");
        } finally {
          applyingRemoteUpdate = false;
        }

        // Submit the merged state for persistence on the server.
        const mergedState = Y.encodeStateAsUpdate(ydoc);
        const reconciliationRequestId = crypto.randomUUID();

        acknowledgementTimer = setTimeout(() => {
          if (acknowledgementReceived || !isCurrentAttempt()) return;

          acknowledgementReceived = true;
          scheduleSyncRetry("Synchronization acknowledgement timed out.");
        }, 10_000);

        socket.emit(
          "collaboration:sync-client-state",
          {
            documentId,
            requestId: reconciliationRequestId,
            state: mergedState,
          },
          (response: CollaborationAct) => {
            if (acknowledgementReceived) return;

            acknowledgementReceived = true;

            if (acknowledgementTimer !== undefined) {
              clearTimeout(acknowledgementTimer);
              acknowledgementTimer = undefined;
            }

            if (!isCurrentAttempt()) return;

            const result = getActionResult(response);

            if (
              !result?.success ||
              result.requestId !== reconciliationRequestId
            ) {
              console.error("[Yjs] Reconciliation failed", {
                response,
                expectedRequestId: reconciliationRequestId,
                receivedRequestId: result?.requestId,
              });

              scheduleSyncRetry(
                result?.message ?? "Unable to reconcile document changes.",
              );
              return;
            }

            clearSyncTimers();

            syncGeneration += 1;
            syncInFlight = false;
            syncAttempt = 0;
            activeSyncRequestId = null;

            isSyncedRef.current = true;
            setIsSynced(true);
            setError(null);

            flushPendingUpdates();
          },
        );
      } catch (cause) {
        applyingRemoteUpdate = false;

        if (acknowledgementTimer !== undefined) {
          clearTimeout(acknowledgementTimer);
        }

        console.error("[Yjs] Failed to reconcile document state:", cause);

        scheduleSyncRetry("Unable to reconcile document state.");
      }
    };

    const handleRemoteUpdate = (payload: CollaborationUpdatePayload) => {
      if (
        !isValidDocument(payload?.documentId ?? "") ||
        payload.documentId !== documentId
      )
        return;

      try {
        const update = toUint8Array(payload.update);

        applyingRemoteUpdate = true;

        try {
          Y.applyUpdate(ydoc, update, "remote");
        } finally {
          applyingRemoteUpdate = false;
        }
      } catch (cause) {
        applyingRemoteUpdate = false;

        console.error("[Yjs] Failed to apply remote update:", cause);
        setError("Unable to apply a remote document update.");
      }
    };

    const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (!active || applyingRemoteUpdate || origin === "remote") {
        return;
      }

      if (pendingUpdates.length >= MAX_PENDING_UPDATES) {
        setError(
          "The pending update queue is full. Reconnect and synchronize before continuing to edit.",
        );
        return;
      }

      pendingUpdates.push(update.slice());
      setSaveStatus("saving");
      setHasUnsavedChanges(true);
      flushPendingUpdates();
    };

    const handleConnectError = (cause: Error) => {
      if (!active) return;

      setError(cause.message || "Unable to connect to collaboration service.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("document:joined", handleJoined);
    socket.on("collaboration:sync-state", handleSyncState);
    socket.on("collaboration:update", handleRemoteUpdate);

    ydoc.on("update", handleLocalUpdate);

    // If already connected, wait for document:joined before syncing.
    // The presence hook owns the room join.

    return () => {
      active = false;
      joined = false;

      resetSyncAttempt();
      resetUpdateAttempt();

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("document:joined", handleJoined);
      socket.off("collaboration:sync-state", handleSyncState);
      socket.off("collaboration:update", handleRemoteUpdate);

      ydoc.off("update", handleLocalUpdate);
    };
  }, [documentId, accessToken, ydoc, enabled, resetVisibleSyncState]);

  return { isSynced, error, saveStatus, hasUnsavedChanges };
}
