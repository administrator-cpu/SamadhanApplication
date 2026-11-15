import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Readable after the first unlock since boot, so a call answered on the lock screen
// (app launched in the background by a VoIP push) can still read the session.
const NATIVE_OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const MIGRATION_KEY = 'keychain_after_first_unlock_v1';

export const storage = {
  getItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch (e) {
        return null;
      }
    }
    return await SecureStore.getItemAsync(key, NATIVE_OPTIONS);
  },

  setItemAsync: async (key, value) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (e) {
      }
      return;
    }
    await SecureStore.setItemAsync(key, value, NATIVE_OPTIONS);
  },

  deleteItemAsync: async (key) => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (e) {
      }
      return;
    }
    await SecureStore.deleteItemAsync(key, NATIVE_OPTIONS);
  },

  /**
   * iOS keeps an item's original accessibility on update, so items written before AFTER_FIRST_UNLOCK
   * must be deleted and written again. Run while the device is unlocked (app in the foreground).
   */
  migrateAccessibility: async (keys) => {
    if (Platform.OS !== 'ios') return;
    try {
      if (await SecureStore.getItemAsync(MIGRATION_KEY, NATIVE_OPTIONS)) return;
      for (const key of keys) {
        const value = await SecureStore.getItemAsync(key);
        if (value === null || value === undefined) continue;
        await SecureStore.deleteItemAsync(key);
        await SecureStore.setItemAsync(key, value, NATIVE_OPTIONS);
      }
      await SecureStore.setItemAsync(MIGRATION_KEY, '1', NATIVE_OPTIONS);
    } catch {
      // Device locked or keychain busy: retried on the next foreground start.
    }
  },
};
