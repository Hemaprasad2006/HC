import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectFocusSocket(userId: string) {
  if (socket) return socket;

  const baseUrl = __DEV__
    ? 'http://10.0.2.2:3000'
    : 'https://life-director-api.onrender.com';

  socket = io(baseUrl, {
    auth: { userId },
    transports: ['websocket'],
  });

  return socket;
}

export function getFocusSocket() {
  return socket;
}

export function disconnectFocusSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
