import { create } from 'zustand';
import { authService } from '../api/authService';
import { userService } from '../api/userService';
import { storage } from '../utils/storage';
import notificationsSafe from '@/utils/notificationsSafe';
import { queryClient } from '../api/queryClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  setUser: (user) => set({ user }),

  hydrate: async () => {
    try {
      const token = await storage.getItemAsync('auth_token');

      if (!token) {
        set({ user: null, isAuthenticated: false });
        return;
      }
      set({ isAuthenticated: true });

      try {
        const data = await authService.getMe();
        set({ user: data.user || data });
      } catch (error) {
        if (error?.status === 401) {
          await get().clearAuth();
        } else if (__DEV__) {
        }
      }
    } finally {
      set({ isInitializing: false });
    }
  },

  login: async (userPayload, accessToken, refreshToken) => {
    try {
      if (accessToken) {
        await storage.setItemAsync('auth_token', accessToken);
      }
      if (refreshToken) {
        await storage.setItemAsync('refresh_token', refreshToken);
      }
      set({ user: userPayload, isAuthenticated: true });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await userService.removePushToken().catch(() => {});
      await authService.logout();
    } finally {
      await notificationsSafe.setBadgeCountAsync(0).catch(() => {});
      queryClient.clear();
      await get().clearAuth();
    }
  },

  clearAuth: async () => {
    await storage.deleteItemAsync('auth_token');
    await storage.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));