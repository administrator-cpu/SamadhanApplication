import { Platform } from 'react-native';
import { storage } from '../utils/storage';

const KEY = 'device_id';
let cached = null;

export async function getDeviceId() {
  if (cached) return cached;
  let id = await storage.getItemAsync(KEY).catch(() => null);
  if (!id) {
    id = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await storage.setItemAsync(KEY, id).catch(() => {});
  }
  cached = id;
  return id;
}
