// app/_layout.jsx
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { setOnSessionExpired } from '../src/api/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '../src/api/queryClient';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import '../global.css';
import OfflineBanner from '../src/components/OfflineBanner';
import InitializingScreen from '../src/components/InitializingScreen';

// 1. ADDED: Import the specific font weights we need
import { useFonts, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
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
  const router = useRouter();
  const segments = useSegments();

  // 2. ADDED: Initialize the fonts
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Karla_400Regular,
    Karla_600SemiBold,
  });

  useEffect(() => {
    setOnSessionExpired(() => {
      clearAuth();
      router.replace('/(auth)/login');
    });
  }, [clearAuth, router]);
  
  usePushNotifications();

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
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    if (!homeRoute) {
      return;
    }

    if (user?.must_change_password && !inForcedChangeScreen) {
      router.replace('/(auth)/force-password-change');
      return;
    }

    if (!user?.must_change_password && inForcedChangeScreen) {
      router.replace(homeRoute);
      return;
    }

    if (inAuthGroup && !inForcedChangeScreen) {
      router.replace(homeRoute);
      return;
    }

    if (inRoleGroup && `(${currentGroup.slice(1, -1)})` !== homeRoute.slice(1)) {
      router.replace(homeRoute);
    }
  }, [isAuthenticated, isInitializing, segments, user?.role, user?.must_change_password]);

  // 3. ADDED: Keep showing your premium loading screen until BOTH auth is ready AND fonts are loaded
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
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}