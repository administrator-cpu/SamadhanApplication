// src/sockets/socketManager.js
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl?.replace('/api', '') || '';

let socket = null;
let pending = null;
const listeners = new Set();
const notify = () => listeners.forEach((cb) => cb(socket));

export function onSocketChange(cb) {
  listeners.add(cb);
  if (socket) cb(socket);
  return () => listeners.delete(cb);
}

export async function connectSocket() {
  if (socket) {
    if (!socket.active) socket.connect();
    return socket;
  }
  if (pending) return pending;

  pending = (async () => {
    const token = await storage.getItemAsync('auth_token');
    if (!token) return null;
    if (socket) return socket;

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
  })();

  try {
    return await pending;
  } finally {
    pending = null;
  }
}

export function disconnectSocket() {
  pending = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    notify();
  }
}

export function getSocket() {
  return socket;
}