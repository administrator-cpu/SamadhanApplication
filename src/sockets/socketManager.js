// src/sockets/socketManager.js
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl?.replace('/api', '') || '';
// Most backends run Socket.IO on the same host as the REST API but without
// the /api prefix — adjust this if your backend's socket path differs.

let socket = null;

export async function connectSocket() {
  if (socket?.connected) return socket;

  const token = await storage.getItemAsync('auth_token');
  if (!token) return null;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}