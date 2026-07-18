// app/_layout.jsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import { setOnSessionExpired } from '../src/api/client';
import { queryClient } from '../src/api/queryClient';
import '../global.css';
import { LogBox } from 'react-native';

SplashScreen.preventAutoHideAsync();

const ROLE_HOME_ROUTES = {
  USER: '/(customer)',
  SUPPORT_AGENT: '/(agent)',
  ADMIN: '/(admin)',
  SALES: '/(sales)',
};

const ROLE_GROUPS = ['(customer)', '(agent)', '(admin)', '(sales)'];

function RootLayoutNav() {
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    setOnSessionExpired(() => {
      clearAuth();
      router.replace('/(auth)/login');
    });
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isInitializing) return;

    const currentGroup = segments[0];
    const inAuthGroup = currentGroup === '(auth)';
    const inRoleGroup = ROLE_GROUPS.includes(currentGroup);
    const homeRoute = ROLE_HOME_ROUTES[user?.role];

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!homeRoute) {
      console.error('[Router Guard] Unknown role:', user?.role);
      return;
    }

    if (inAuthGroup) {
      router.replace(homeRoute);
      return;
    }

    if (inRoleGroup && `(${currentGroup.slice(1, -1)})` !== homeRoute.slice(1)) {
      router.replace(homeRoute);
    }
  }, [isAuthenticated, isInitializing, segments, user?.role]);

  useEffect(() => {
    if (!isInitializing) SplashScreen.hideAsync();
  }, [isInitializing]);

  if (isInitializing) return null;

  LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(auth)"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(agent)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(sales)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}