// src/utils/notificationsSafe.js
// expo-notifications throws synchronously at IMPORT time in Expo Go
// (SDK 53+ on Android) — not at call time — so a static `import` can't be
// wrapped in try/catch. require() inside try/catch can, since it actually
// executes at that line rather than being hoisted like ESM import.
let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

export const isPushAvailable = !!Notifications;

const stub = {
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ status: 'undetermined' }),
  requestPermissionsAsync: async () => ({ status: 'undetermined' }),
  setNotificationChannelAsync: async () => {},
  getExpoPushTokenAsync: async () => ({ data: null }),
  setBadgeCountAsync: async () => {},
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  getLastNotificationResponseAsync: async () => null,
  clearLastNotificationResponseAsync: async () => {},
  setNotificationCategoryAsync: async () => null,
  getPresentedNotificationsAsync: async () => [],
  dismissNotificationAsync: async () => {},
  AndroidImportance: { HIGH: 4, MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  AndroidAudioUsage: { NOTIFICATION_RINGTONE: 6 },
  AndroidAudioContentType: { SONIFICATION: 4 },
};

export default Notifications || stub;
