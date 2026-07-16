import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch (e) {
        console.error('Local storage is unavailable:', e);
        return null;
      }
    }
    return await SecureStore.getItemAsync(key);
  },

  setItemAsync: async (key, value) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  deleteItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Local storage is unavailable:', e);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};