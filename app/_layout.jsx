import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setOnSessionExpired } from '../src/api/client';
import { useAuthStore } from '../src/store/authStore';
import { queryClient, persistOptions } from '../src/api/queryClient';
import '../global.css';
import InitializingScreen from '../src/components/InitializingScreen';
import OfflineBanner from '../src/components/OfflineBanner';
import { useBadgeCount } from '../src/hooks/useBadgeCount';
import { useOfflineFlush } from '../src/hooks/useOfflineFlush';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

import { Fraunces_500Medium, useFonts } from '@expo-google-fonts/fraunces';
import { Karla_400Regular, Karla_600SemiBold } from '@expo-google-fonts/karla';

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

SplashScreen.preventAutoHideAsync();

const ROLE_HOME_ROUTES = {
  USER: '/(customer)',
  SUPPORT_AGENT: '/(agent)',
  ADMIN: '/(admin)',
  SALES: '/(sales)',
};

const ROLE_GROUPS = ['(customer)', '(agent)', '(admin)', '(sales)'];

function RootLayoutNav() {
  const { isInitializing, isAuthenticated, user, hydrate, clearAuth } = useAuthStore();
  
  // FIX: Destructure exactly what we need so NativeWind's logger doesn't crash on the router object
  const { replace } = useRouter(); 
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Karla_400Regular,
    Karla_600SemiBold,
  });

  useEffect(() => {
    setOnSessionExpired(() => {
      clearAuth();
      replace('/(auth)/login'); // Updated
    });
  }, [clearAuth, replace]);

  usePushNotifications();
  useBadgeCount();
  useOfflineFlush();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (isInitializing) return;

    const currentGroup = segments[0];
    const inAuthGroup = currentGroup === '(auth)';
    const inForcedChangeScreen = currentGroup === '(auth)' && segments[1] === 'force-password-change';
    const inRoleGroup = ROLE_GROUPS.includes(currentGroup);
    const homeRoute = ROLE_HOME_ROUTES[user?.role];

    if (!isAuthenticated) {
      if (!inAuthGroup) replace('/(auth)/login'); // Updated
      return;
    }

    if (!homeRoute) {
      return;
    }

    if (user?.must_change_password && !inForcedChangeScreen) {
      replace('/(auth)/force-password-change'); // Updated
      return;
    }

    if (!user?.must_change_password && inForcedChangeScreen) {
      replace(homeRoute); // Updated
      return;
    }

    if (inAuthGroup && !inForcedChangeScreen) {
      replace(homeRoute); // Updated
      return;
    }

    if (inRoleGroup && `(${currentGroup.slice(1, -1)})` !== homeRoute.slice(1)) {
      replace(homeRoute); // Updated
    }
  }, [isAuthenticated, isInitializing, segments, user?.role, user?.must_change_password, replace]);

  if (isInitializing || (!fontsLoaded && !fontError)) {
    return <InitializingScreen />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(agent)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(sales)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RootLayoutNav />
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}