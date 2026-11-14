import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { storage } from '../utils/storage';
import { userService } from '../api/userService';
import { notificationService, isNotificationServiceConfigured } from '../api/notificationService';
import { getDeviceId } from './deviceId';

const TOKEN_KEY = 'push_token';

// Registers with the Notification Service; falls back to the legacy backend endpoint during rollout.
export async function registerPushToken(token) {
  if (!token) return;
  const deviceId = await getDeviceId();
  let registered = false;

  if (isNotificationServiceConfigured) {
    try {
      await notificationService.register({
        token,
        kind: 'expo',
        platform: Platform.OS,
        deviceId,
        appVersion: Application.nativeApplicationVersion ?? '',
      });
      registered = true;
    } catch {
      registered = false;
    }
  }

  if (!registered) {
    await userService.registerPushToken(token, Platform.OS, deviceId);
  }

  await storage.setItemAsync(TOKEN_KEY, token).catch(() => {});
}

// Removes ONLY this device's token. Never calls the legacy endpoint without a token.
export async function unregisterPushToken() {
  const [token, deviceId] = await Promise.all([
    storage.getItemAsync(TOKEN_KEY).catch(() => null),
    getDeviceId(),
  ]);

  const jobs = [];
  if (isNotificationServiceConfigured) jobs.push(notificationService.remove({ deviceId, token }));
  if (token) jobs.push(userService.removePushToken(token, deviceId));

  await Promise.allSettled(jobs);
  await storage.deleteItemAsync(TOKEN_KEY).catch(() => {});
}
