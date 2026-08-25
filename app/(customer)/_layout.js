// app/(customer)/_layout.jsx
import { Tabs } from 'expo-router';

export default function CustomerTabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="raise-ticket" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="connections" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="support-guidelines" />
    </Tabs>
  );
}