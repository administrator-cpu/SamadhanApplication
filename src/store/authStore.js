import { create } from 'zustand';
import { authService } from '../api/authService';
import { storage } from '../utils/storage';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,

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
          console.warn('[AuthStore] getMe() failed on hydrate (likely offline). Keeping local session.');
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
      console.error('[AuthStore] Failed to save auth session', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout().catch(() =>
        console.warn('[AuthStore] Server logout failed, proceeding locally.')
      );
    } finally {
      await get().clearAuth();
    }
  },

  clearAuth: async () => {
    await storage.deleteItemAsync('auth_token');
    await storage.deleteItemAsync('refresh_token');
    set({ user: null, isAuthenticated: false });
  },
}));