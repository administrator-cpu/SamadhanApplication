import apiClient from './client';

export const authService = {
  login: async (email, password) => {
    const { data } = await apiClient.post('/login', { email, password });
    // Backend shape: { success, data: { user, accessToken, refreshToken } }
    return data.data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/users/me');
    return data.data;
  },

  logout: async () => {
    const { data } = await apiClient.post('/logout');
    return data;
  },

  // used later for forgot-password flow
  forgotPassword: async (email) => {
    const { data } = await apiClient.post('/forgot-password', { email });
    return data;
  },
};