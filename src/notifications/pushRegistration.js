import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Notifications, { isPushAvailable } from '../utils/notificationsSafe';
import { DECLINE_URL } from '../calls/backgroundCallTask';
import { CallUi } from '../../modules/call-ui';
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

const VOIP_WAIT_MS = 10000;

function waitForVoipToken() {
  const current = CallUi.getVoipToken();
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const sub = CallUi.addVoipTokenListener((token) => {
      if (!token) return;
      clearTimeout(timer);
      sub.remove();
      resolve(token);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(CallUi.getVoipToken());
    }, VOIP_WAIT_MS);
  });
}

async function getNativeCallToken() {
  if (!CallUi.isAvailable) return null;
  if (Platform.OS === 'ios') {
    const token = await waitForVoipToken();
    return token ? { kind: 'apns_voip', token } : null;
  }
  if (Platform.OS === 'android' && isPushAvailable && Device.isDevice) {
    const res = await Notifications.getDevicePushTokenAsync();
    return res?.data ? { kind: 'fcm', token: String(res.data) } : null;
  }
  return null;
}

/**
 * Registers the token that rings the phone natively for calls: PushKit VoIP (iOS) or the raw FCM token (Android).
 * Independent of notification permission: VoIP pushes and FCM data messages are delivered without it.
 */
export async function registerCallToken(known = null) {
  const deviceId = await getDeviceId();
  CallUi.setConfig({ deviceId, declineUrl: DECLINE_URL });
  if (!isNotificationServiceConfigured) return;

  const native = known ?? (await getNativeCallToken());
  if (!native?.token) return;

  await notificationService.register({
    token: native.token,
    kind: native.kind,
    platform: Platform.OS,
    deviceId,
    appVersion: Application.nativeApplicationVersion ?? '',
  });
}
