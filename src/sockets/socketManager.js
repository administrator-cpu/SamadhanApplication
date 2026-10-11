// src/sockets/socketManager.js
import { io } from 'socket.io-client';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const SOCKET_URL = Constants.expoConfig?.extra?.apiUrl?.replace('/api', '') || '';

let socket = null;
let pending = null;
let appState = AppState.currentState;
const listeners = new Set();
const notify = () => listeners.forEach((cb) => cb(socket));

const isForeground = () => appState !== 'background';

function reportAppState(s = socket) {
  if (s?.connected) s.emit('app:state', isForeground() ? 'active' : 'background');
}

AppState.addEventListener('change', (next) => {
  appState = next;
  reportAppState();
  if (next === 'active' && socket && !socket.connected && !socket.active) socket.connect();
});

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

    const s = io(SOCKET_URL, {
      auth: (cb) => {
        storage
          .getItemAsync('auth_token')
          .then((t) => cb({ token: t }))
          .catch(() => cb({}));
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    s.on('connect', () => reportAppState(s));
    s.on('connect_error', () => {
      if (!s.active) {
        setTimeout(() => {
          if (socket === s && !s.connected) s.connect();
        }, 5000);
      }
    });

    socket = s;
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