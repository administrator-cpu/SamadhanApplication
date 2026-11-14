import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';
import { authService } from './authService';

const NOTIF_URL = Constants.expoConfig?.extra?.notifUrl;

export const isNotificationServiceConfigured = !!NOTIF_URL;

const http = axios.create({
  baseURL: NOTIF_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

http.interceptors.request.use(async (config) => {
  const token = await storage.getItemAsync('auth_token').catch(() => null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The service verifies the backend-issued JWT. On 401, let the main client refresh it, then retry once.
http.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry) {
    original._retry = true;
    try {
      await authService.getMe();
      return http(original);
    } catch {
      // fall through
    }
  }
  return Promise.reject(error);
});

export const notificationService = {
  register: async ({ token, kind = 'expo', platform, deviceId, appVersion }) => {
    const { data } = await http.post('/v1/devices/register', { token, kind, platform, deviceId, appVersion });
    return data;
  },

  remove: async ({ deviceId, token }) => {
    const { data } = await http.post('/v1/devices/remove', { deviceId, token });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await http.get('/v1/unread-count');
    return Number(data?.data?.count ?? data?.count ?? 0) || 0;
  },

  markTicketRead: async (ticketId) => {
    const { data } = await http.post('/v1/read', { ticketId });
    return data;
  },
};
