import { io, type Socket } from "socket.io-client";

import { env } from "@/libs/env";

const RECONNECTION_ATTEMPTS = 8;
const RECONNECTION_DELAY = 1000;
const RECONNECTION_DELAY_MAX = 10000;
const CONNECTION_TIMEOUT = 10000;

let socket: Socket | null = null;

export function getSocketClient(accessToken: string): Socket {
  if (!socket) {
    socket = io(`${env.urls.socketUrl}/collaboration`, {
      autoConnect: false,
      auth: {
        token: accessToken,
      },

      // Automatic reconnection
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      randomizationFactor: 0.5,

      // Connection timeout
      timeout: CONNECTION_TIMEOUT,
    });
  } else {
    const currentAuth = socket.auth as { token?: string };

    if (currentAuth.token !== accessToken) {
      socket.auth = {
        token: accessToken,
      };

      // Reconnect using the updated authentication token.
      if (socket.connected) {
        socket.disconnect();
        socket.connect();
      }
    }
  }

  return socket;
}

export function connectSocket(accessToken: string): Socket {
  const client = getSocketClient(accessToken);

  if (!client.connected && !client.active) {
    client.connect();
  }

  return client;
}

export function disconnectSocket(): void {
  if (!socket) return;

  // Explicitly disconnecting disables automatic reconnection.
  socket.disconnect();
  socket = null;
}