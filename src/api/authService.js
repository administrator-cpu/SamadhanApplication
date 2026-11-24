import apiClient from './client';
import { storage } from '../utils/storage';

export const authService = {
  login: async (email, password) => {
    const { data } = await apiClient.post('/login', { email, password });
    return data.data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/users/me');
    return data.data;
  },

  logout: async () => {
    const refreshToken = await storage.getItemAsync('refresh_token').catch(() => null);
    const { data } = await apiClient.post('/logout', refreshToken ? { refreshToken } : {});
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await apiClient.post('/forgot-password', { email });
    return data;
  },

  verifyOtp: async (email, otpCode) => {
    const { data } = await apiClient.post('/verify-otp', { email, otpCode });
    return data;
  },

  resetPassword: async (email, otpCode, newPassword) => {
    const { data } = await apiClient.post('/reset-password', { email, otpCode, newPassword });
    return data;
  },

  changePassword: async (currentPassword, newPassword) => {
  const payload = currentPassword ? { currentPassword, newPassword } : { newPassword };
  const { data } = await apiClient.post('/change-password', payload);
  return data;
},
};