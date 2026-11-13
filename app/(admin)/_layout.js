// app/(admin)/_layout.js
import { Tabs, useSegments } from 'expo-router';
import AppTabBar from '../../src/components/layout/AppTabBar';
import { TabBarInsetProvider } from '../../src/components/layout/TabBarInset';

const TAB_ITEMS = {
  index: { icon: 'grid' },
  tickets: { icon: 'list' },
  staff: { icon: 'users' },
  customers: { icon: 'briefcase' },
  profile: { icon: 'user' },
  reports: { icon: 'bar-chart-2' },
};

export default function AdminTabsLayout() {
  const segments = useSegments();
  const hideTabBar = segments.includes('[id]');

  return (
    <TabBarInsetProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AppTabBar {...props} items={TAB_ITEMS} theme="pill" hidden={hideTabBar} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
        <Tabs.Screen name="staff" options={{ title: 'Staff' }} />
        <Tabs.Screen name="customers" options={{ title: 'Customers' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      </Tabs>
    </TabBarInsetProvider>
  );
}
