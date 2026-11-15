// src/hooks/usePushNotifications.js
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Notifications, { isPushAvailable } from '../utils/notificationsSafe';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { queryClient } from '../api/queryClient';
import { notificationService, isNotificationServiceConfigured } from '../api/notificationService';
import { registerCallToken, registerPushToken } from '../notifications/pushRegistration';
import { CallUi } from '../../modules/call-ui';
import { CHANNELS } from '../notifications/channels';

const SILENT_IN_FOREGROUND = new Set(['call_invite', 'call_cancel']);
const REREGISTER_AFTER_MS = 6 * 60 * 60 * 1000;

const ROLE_PATHS = {
  USER: '/(customer)',
  SUPPORT_AGENT: '/(agent)',
  ADMIN: '/(admin)',
  SALES: '/(sales)',
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification?.request?.content?.data?.type;
    const show = !SILENT_IN_FOREGROUND.has(type);
    return {
      shouldShowAlert: show,
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
    };
  },
});

async function setupAndroidChannels() {
  const lockscreenVisibility = Notifications.AndroidNotificationVisibility?.PUBLIC;
  await Notifications.setNotificationChannelAsync(CHANNELS.DEFAULT, {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
    lockscreenVisibility,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.TICKET_UPDATES, {
    name: 'Ticket updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
    lockscreenVisibility,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.ASSIGNMENTS, {
    name: 'Assignments',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563eb',
    lockscreenVisibility,
  });
  await Notifications.deleteNotificationChannelAsync('incoming_call').catch(() => {});
  await Notifications.setNotificationChannelAsync(CHANNELS.MISSED_CALL, {
    name: 'Missed calls',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility,
  });
}

async function getDevicePushToken() {
  if (!isPushAvailable || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await setupAndroidChannels().catch(() => {});
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResponse?.data ?? null;
}

async function registerWithRetry(isCancelled) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const token = await getDevicePushToken();
      if (!token || isCancelled()) return;
      await registerPushToken(token);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      if (isCancelled()) return;
    }
  }
}

async function registerCallTokenWithRetry(isCancelled, known = null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (isCancelled()) return;
      await registerCallToken(known);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
}

function registerAll(isCancelled) {
  return Promise.all([registerWithRetry(isCancelled), registerCallTokenWithRetry(isCancelled)]);
}

function refreshAfterNotification(data) {
  queryClient.invalidateQueries({ queryKey: ['tickets'] });
  if (data?.ticketId) {
    queryClient.invalidateQueries({ queryKey: ['ticket', String(data.ticketId)] });
    queryClient.invalidateQueries({ queryKey: ['ticket', Number(data.ticketId)] });
  }
  queryClient.invalidateQueries({ queryKey: ['unread-count'] });
}

export function usePushNotifications() {
  const router = useRouter();
  const navReady = !!useRootNavigationState()?.key;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const role = useAuthStore((s) => s.user?.role);

  const [pendingTarget, setPendingTarget] = useState(null);
  const handledIds = useRef(new Set());
  const lastRegisteredAt = useRef(0);

  // Register on every app start / login.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    registerAll(() => cancelled).then(() => {
      lastRegisteredAt.current = Date.now();
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Re-register when the OS rotates the token.
  useEffect(() => {
    if (!isAuthenticated || !isPushAvailable || typeof Notifications.addPushTokenListener !== 'function') return;
    const sub = Notifications.addPushTokenListener(() => {
      registerAll(() => false);
    });
    return () => sub?.remove?.();
  }, [isAuthenticated]);

  // PushKit hands out / rotates the VoIP token on its own schedule (iOS).
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = CallUi.addVoipTokenListener((token) => {
      if (token) registerCallTokenWithRetry(() => false, { kind: 'apns_voip', token });
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Re-register after long background periods so "last seen" stays fresh and dead rows self-heal.
  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (Date.now() - lastRegisteredAt.current < REREGISTER_AFTER_MS) return;
      lastRegisteredAt.current = Date.now();
      registerAll(() => false);
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Capture taps: background/foreground via listener, cold start via last response.
  useEffect(() => {
    if (!isPushAvailable) return;

    const capture = (response) => {
      const request = response?.notification?.request;
      const data = request?.content?.data;
      if (!data?.ticketId) return;
      const id = request?.identifier;
      if (id) {
        if (handledIds.current.has(id)) return;
        handledIds.current.add(id);
      }
      setPendingTarget({ ticketId: String(data.ticketId), role: data.role });
      Notifications.clearLastNotificationResponseAsync?.().catch?.(() => {});
    };

    const sub = Notifications.addNotificationResponseReceivedListener(capture);
    Notifications.getLastNotificationResponseAsync?.()
      .then((response) => response && capture(response))
      .catch(() => {});

    return () => sub?.remove?.();
  }, []);

  // Navigate once the navigator is mounted and the session is hydrated.
  useEffect(() => {
    if (!pendingTarget || !navReady || isInitializing) return;
    if (!isAuthenticated) {
      setPendingTarget(null);
      return;
    }
    const effectiveRole = role ?? pendingTarget.role;
    const rolePath = ROLE_PATHS[effectiveRole];
    if (!rolePath) return; // user profile still loading
    setPendingTarget(null);
    router.push(`${rolePath}/tickets/${pendingTarget.ticketId}`);
    if (isNotificationServiceConfigured) {
      notificationService.markTicketRead(pendingTarget.ticketId).catch(() => {});
    }
  }, [pendingTarget, navReady, isInitializing, isAuthenticated, role, router]);

  // Keep cached ticket data and unread badge fresh when a push arrives in the foreground.
  useEffect(() => {
    if (!isPushAvailable) return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      refreshAfterNotification(notification?.request?.content?.data);
    });
    return () => sub?.remove?.();
  }, []);
}
