// src/hooks/usePushNotifications.js
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Notifications, { isPushAvailable } from '../utils/notificationsSafe';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { userService } from '../api/userService';
import { useAuthStore } from '../store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  if (!isPushAvailable) return null;
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenResponse.data;
}

export function usePushNotifications() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  // Register token whenever the user becomes authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    let isCancelled = false;

    (async () => {
      const token = await registerForPushNotifications();
      if (token && !isCancelled) {
        try {
          await userService.registerPushToken(token, Platform.OS);
        } catch (error) {
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  // Handle notification taps — deep link to the relevant ticket
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.ticketId && data?.role) {
        const rolePath = {
          USER: '/(customer)',
          SUPPORT_AGENT: '/(agent)',
          ADMIN: '/(admin)',
          SALES: '/(sales)',
        }[data.role];

        if (rolePath) {
          router.push(`${rolePath}/tickets/${data.ticketId}`);
        }
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  // Optional: log foreground notifications for debugging
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
    });

    return () => {
      notificationListener.current?.remove();
    };
  }, []);
}