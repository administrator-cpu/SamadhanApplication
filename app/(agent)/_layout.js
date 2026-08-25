// app/(agent)/_layout.js
import { Platform } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const BASE_TAB_BAR_STYLE = {
  position: 'absolute',
  bottom: Platform.OS === 'android' ? 24 : 32,
  left: 20,
  right: 20,
  // height: 30,
  borderRadius: 30,
  backgroundColor: '#ffffff',
  borderTopWidth: 0,
  elevation: 0,
  paddingBottom: 0,
  paddingTop: 0,
  shadowColor: '#a8a29e',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.1,
  shadowRadius: 20,
};

export default function AgentTabsLayout() {
  const segments = useSegments();
  const hideTabBar = segments.includes('[id]');

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: '#fafaf9' }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5A36',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: false,
        safeAreaInsets: { bottom: 0, top: 0 },
        tabBarStyle: hideTabBar ? { display: 'none' } : BASE_TAB_BAR_STYLE,
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Queue',
          tabBarIcon: ({ color, size }) => <Feather name="list" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}