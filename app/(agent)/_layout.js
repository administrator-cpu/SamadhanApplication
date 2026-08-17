// app/(agent)/_layout.js
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function AgentTabsLayout() {
  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: '#fafaf9' }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5A36',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarShowLabel: false,
        safeAreaInsets: { bottom: 0, top: 0 },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'android' ? 24 : 32,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 30,
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: '#a8a29e',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
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
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'My Queue',
          tabBarIcon: ({ color, size }) => <Feather name="list" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}