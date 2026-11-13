// app/(agent)/_layout.js
import { Tabs, useSegments } from 'expo-router';
import AppTabBar from '../../src/components/layout/AppTabBar';
import { TabBarInsetProvider } from '../../src/components/layout/TabBarInset';

const TAB_ITEMS = {
  index: { icon: 'grid' },
  tickets: { icon: 'list' },
  profile: { icon: 'user' },
};

export default function AgentTabsLayout() {
  const segments = useSegments();
  const hideTabBar = segments.includes('[id]');

  return (
    <TabBarInsetProvider>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#fafaf9' } }}
        tabBar={(props) => <AppTabBar {...props} items={TAB_ITEMS} theme="minimal" hidden={hideTabBar} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="tickets" options={{ title: 'My Queue' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </TabBarInsetProvider>
  );
}
