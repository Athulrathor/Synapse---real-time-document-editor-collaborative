import { io, type Socket } from "socket.io-client";
import { env } from "@/libs/env";

const accessToken = "dfjskdfjhufsdfjosdifjdslfjksofjlskdfjoiefjsldkfneuwothosn";

let socket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socket) {
    socket = io(env.urls.socketUrl, {
      autoConnect: false,
      auth: {
        token: accessToken,
      },
    });
  }

  return socket;
}

export function connectSocket(): Socket {
  const client = getSocketClient();

  if (!client.connected) {
    client.connect();
  }

  return client;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
