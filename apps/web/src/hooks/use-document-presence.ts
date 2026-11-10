"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import { connectSocket } from "@/libs/socket-client";
import type {
  DocumentPresence,
  TypingUpdate,
  TypingUser,
} from "@/types/presence.type";

interface UseDocumentPresenceOptions {
  documentId: string;
  accessToken: string;
  enabled?: boolean;
}

interface UseDocumentPresenceReturn {
  presence: DocumentPresence | null;
  isConnected: boolean;
  error: string | null;
  setStatus: (status: "viewing" | "editing") => void;
  setTyping: (isTyping: boolean) => void;
  typingUsers: TypingUser[];
  setCursor: (position: number, selectionEnd?: number) => void;
  cursorUpdates: RemoteCursorUpdate[];
  retryJoin: () => void;
  isJoining: boolean;
  connectionStatus: SocketConnectionStatus;
}

interface JoinResponse {
  success?: boolean;
  message?: string;
  data?: {
    success?: boolean;
    message?: string;
  };
}

export interface RemoteCursorUpdate {
  documentId: string;
  userId: string;
  name?: string;
  position: number;
  selectionEnd: number;
  status?: "viewing" | "editing";
}

export type SocketConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

const JOIN_MAX_ATTEMPTS = 5;
const JOIN_RETRY_DELAY_MS = 1500;

type PresenceStatus = "viewing" | "editing";

export function useDocumentPresence({
  documentId,
  accessToken,
  enabled = true,
}: UseDocumentPresenceOptions): UseDocumentPresenceReturn {
  const [presence, setPresence] = useState<DocumentPresence | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const joinedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const [cursorUpdates, setCursorUpdates] = useState<RemoteCursorUpdate[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [connectionStatus, setConnectionStatus] =
  useState<SocketConnectionStatus>("connecting");

  const setStatus = (status: PresenceStatus) => {
    const socket = socketRef.current;

    if (!enabled || !socket?.connected || !joinedRef.current) {
      return;
    }

    socket.emit("presence:set-status", {
      documentId,
      status,
    });
  };

  const setTyping = (isTyping: boolean) => {
    const socket = socketRef.current;

    if (!enabled || !socket?.connected || !joinedRef.current) {
      return;
    }

    socket.emit("presence:set-typing", {
      documentId,
      isTyping,
    });
  };

  const setCursor = (position: number, selectionEnd?: number) => {
    const socket = socketRef.current;

    if (!enabled || !socket?.connected || !joinedRef.current) {
      return;
    }

    socket.emit("document:cursor-update", {
      documentId,
      position,
      selectionEnd: selectionEnd ?? position,
    });
  };

  const retryJoinRef = useRef<(() => void) | null>(null);

  const retryJoin = () => {
    retryJoinRef.current?.();
  };

  useEffect(() => {
    if (!enabled || !documentId || !accessToken) {
      socketRef.current = null;
      joinedRef.current = false;
      // setIsConnected(false);
      // setPresence(null);
      // setError(null);
      return;
    }

    const socket: Socket = connectSocket(accessToken);
    socketRef.current = socket;

    let active = true;
    let joined = false;
    let joinInFlight = false;
    let attempts = 0;
    let joinGeneration = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let joinTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearJoinTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (joinTimeout) clearTimeout(joinTimeout);

      retryTimer = undefined;
      joinTimeout = undefined;
    };

    const getResult = (response?: JoinResponse) => response?.data ?? response;

    const scheduleJoinRetry = (message: string) => {
      if (!active || !socket.connected || joined || retryTimer) return;

      joinInFlight = false;
      setIsJoining(false);

      if (joinTimeout) {
        clearTimeout(joinTimeout);
        joinTimeout = undefined;
      }

      if (attempts >= JOIN_MAX_ATTEMPTS) {
        setError(`${message} Automatic retries exhausted.`);
        return;
      }

      const delay = Math.min(
        JOIN_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1),
        15000,
      );

      setError(`${message} Retrying in ${Math.ceil(delay / 1000)}s…`);

      retryTimer = setTimeout(() => {
        retryTimer = undefined;
        joinDocument();
      }, delay);
    };

    const joinDocument = () => {
      // if (
      //   !active ||
      //   !socket.connected ||
      //   joined ||
      //   joinInFlight ||
      //   retryTimer
      // ) {
      //   return;
      // }

      // joinInFlight = true;
      // attempts += 1;

      // joinTimeout = setTimeout(() => {
      //   joinTimeout = undefined;

      //   if (active && joinInFlight && !joined) {
      //     scheduleJoinRetry("Joining the document timed out.");
      //   }
      // }, 8000);

      joinInFlight = true;
      setIsJoining(true);
      attempts += 1;

      const generation = ++joinGeneration;

      joinTimeout = setTimeout(() => {
        if (
          !active ||
          generation !== joinGeneration ||
          !joinInFlight ||
          joined
        ) {
          return;
        }

        joinTimeout = undefined;
        scheduleJoinRetry("Joining the document timed out.");
      }, 8000);

      socket.emit("document:join", { documentId }, (response: JoinResponse) => {
        if (!active || generation !== joinGeneration || !joinInFlight) return;

        const result = getResult(response);

        if (result?.success === false) {
          scheduleJoinRetry(result.message ?? "Unable to join the document.");
        }

        // Wait for document:joined to confirm successful room membership.
      });
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      setIsConnected(true);
      setPresence(null);
      setError(null);

      joined = false;
      joinedRef.current = false;
      attempts = 0;
      joinInFlight = false;

      clearJoinTimers();
      joinDocument();
    };

    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
      setIsConnected(false);
      setPresence(null);
      setTypingUsers([]);
      setCursorUpdates([]);

      joined = false;
      joinedRef.current = false;
      joinInFlight = false;
      attempts = 0;

      joinGeneration += 1;

      clearJoinTimers();
    };

    const handlePresenceUpdate = (data: DocumentPresence) => {
      if (!active || data.documentId !== documentId) return;

      setPresence(data);

      const activeUserIds = new Set(data.users.map((user) => user.userId));

      setCursorUpdates((previous) =>
        previous.filter((cursor) => activeUserIds.has(cursor.userId)),
      );
    };

    const handleTypingUpdate = (data: TypingUpdate) => {
      if (!active || data.documentId !== documentId) return;

      setTypingUsers(data.typingUsers);
    };

    const handleDocumentJoined = (data?: { documentId?: string }) => {
      if (!active || data?.documentId !== documentId) return;

      clearJoinTimers();

      joined = true;
      joinedRef.current = true;
      joinInFlight = false;
      attempts = 0;

      setIsJoining(false);
      setError(null);
    };

    const handleError = (data: { message?: string }) => {
      if (!active) return;
      setConnectionStatus("reconnecting");
      setError(data.message ?? "Unable to connect to document presence.");
    };

    const handleCursorUpdated = (update: RemoteCursorUpdate) => {
      if (!active || update.documentId !== documentId) return;

      setCursorUpdates((previous) => {
        const existing = previous.find(
          (cursor) => cursor.userId === update.userId,
        );

        if (existing) {
          return previous.map((cursor) =>
            cursor.userId === update.userId ? update : cursor,
          );
        }

        return [...previous, update];
      });
    };

    const handleUserLeft = (data: { documentId: string; userId: string }) => {
      if (!active || data.documentId !== documentId) return;

      setCursorUpdates((previous) =>
        previous.filter((cursor) => cursor.userId !== data.userId),
      );
    };

    const manualRetry = () => {
      if (!active || joined) return;

      clearJoinTimers();

      // Invalidate previous join callbacks.
      joinGeneration += 1;

      joinInFlight = false;
      attempts = 0;

      setError(null);

      if (socket.connected) {
        joinDocument();
      } else {
        socket.connect();
      }
    };

    retryJoinRef.current = manualRetry;

    socket.on("document:cursor-updated", handleCursorUpdated);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("document:joined", handleDocumentJoined);
    socket.on("presence:typing-update", handleTypingUpdate);
    socket.on("presence:user-left", handleUserLeft);
    socket.on("connect_error", handleError);

    if (socket.connected) {
      queueMicrotask(() => {
        if (!active) return;

        setIsConnected(true);
        joinDocument();
      });
    }

    return () => {
      active = false;

      const wasJoined = joined;

      joined = false;
      joinedRef.current = false;

      clearJoinTimers();

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("document:joined", handleDocumentJoined);
      socket.off("document:cursor-updated", handleCursorUpdated);
      socket.off("presence:typing-update", handleTypingUpdate);
      socket.off("presence:user-left", handleUserLeft);
      socket.off("connect_error", handleError);

      if (retryJoinRef.current) {
        retryJoinRef.current = null;
      }

      if (socketRef.current === socket) {
        socketRef.current = null;
      }

      if (socket.connected && wasJoined) {
        socket.emit("document:leave", { documentId });
      }
    };
  }, [documentId, accessToken, enabled]);

  return {
    presence: enabled && documentId && accessToken ? presence : null,
    isConnected: Boolean(enabled && documentId && accessToken && isConnected),
    error: enabled && documentId && accessToken ? error : null,
    setStatus,
    setTyping,
    typingUsers: enabled && documentId && accessToken ? typingUsers : [],
    setCursor,
    cursorUpdates,
    retryJoin,
    isJoining,
    connectionStatus
  };
}
