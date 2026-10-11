// src/sockets/socketManager.js
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl?.replace('/api', '') || '';

let socket = null;
const listeners = new Set();
const notify = () => listeners.forEach((cb) => cb(socket));

export function onSocketChange(cb) {
  listeners.add(cb);
  if (socket) cb(socket);
  return () => listeners.delete(cb);
}

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

  notify();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    notify();
  }
}

export function getSocket() {
  return socket;
}