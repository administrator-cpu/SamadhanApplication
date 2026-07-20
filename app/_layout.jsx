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
import { queryClient } from '../src/api/queryClient';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import '../global.css';
import OfflineBanner from '../src/components/OfflineBanner';

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

// Keep splash screen visible only until our React component mounts
SplashScreen.preventAutoHideAsync();

const ROLE_HOME_ROUTES = {
  USER: '/(customer)',
  SUPPORT_AGENT: '/(agent)',
  ADMIN: '/(admin)',
  SALES: '/(sales)',
};

const ROLE_GROUPS = ['(customer)', '(agent)', '(admin)', '(sales)'];

// --- PREMIUM LOADING UI ---
// This replaces the boring 'return null' with an eye-candy loading state
function InitializingScreen() {
  return (
    <View className="flex-1 bg-slate-900 justify-center items-center">
      <StatusBar style="light" />
      {/* Immersive background glow */}
      <View className="absolute w-72 h-72 bg-blue-600 rounded-full opacity-20 blur-3xl" />
      
      {/* App Icon / Branding */}
      <View className="w-20 h-20 bg-blue-600 rounded-[24px] items-center justify-center mb-8 shadow-2xl shadow-blue-600/50">
        <Feather name="wifi" size={40} color="#ffffff" />
      </View>
      
      <ActivityIndicator size="large" color="#3b82f6" className="mb-4" />
      <Text className="text-slate-400 font-bold tracking-widest uppercase text-xs">
        Securing Connection...
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { isInitializing, isAuthenticated, user, hydrate, clearAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

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

  // Hide the static native splash screen as soon as this component mounts.
  // This allows our beautiful `InitializingScreen` to take over smoothly.
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

  // Forced password change takes priority over everything else once logged in.
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

  // Render our premium loading screen instead of an empty screen
  if (isInitializing) {
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
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}