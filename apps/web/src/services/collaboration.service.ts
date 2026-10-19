import { connectSocket, getSocketClient } from "@/libs/socket-client";
import type {
  JoinDocumentPayload,
  LeaveDocumentPayload,
} from "@/types/collaboration.type";

export const collaborationService = {
  connect() {
    return connectSocket();
  },

  disconnect() {
    getSocketClient().disconnect();
  },

  joinDocument(payload: JoinDocumentPayload) {
    getSocketClient().emit("collaboration:join", payload);
  },

  leaveDocument(payload: LeaveDocumentPayload) {
    getSocketClient().emit("collaboration:leave", payload);
  },

  onConnect(callback: () => void) {
    const socket = getSocketClient();
    socket.on("connect", callback);

    return () => socket.off("connect", callback);
  },

  onDisconnect(callback: () => void) {
    const socket = getSocketClient();
    socket.on("disconnect", callback);

    return () => socket.off("disconnect", callback);
  },
};