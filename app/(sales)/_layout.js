// app/(sales)/_layout.js
// Two-object dock: a slim ink capsule carries navigation, a wide violet pill
// carries the action. Rendered through the shared AppTabBar contract.
import { Tabs, useRouter, useSegments } from 'expo-router';
import AppTabBar from '../../src/components/layout/AppTabBar';
import { TabBarInsetProvider } from '../../src/components/layout/TabBarInset';

// The dock is currently switched off; the dashboard carries the raise action.
const DOCK_ENABLED = false;

const TAB_ITEMS = {
  index: { icon: 'home', label: 'Home' },
  tickets: { icon: 'inbox', label: 'Tickets' },
  profile: { icon: 'user', label: 'You' },
};

export default function SalesTabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const hideDock = !DOCK_ENABLED || segments.includes('[id]') || segments.includes('raise-ticket');

  const action = {
    label: 'Raise',
    icon: 'plus',
    accessibilityLabel: 'Raise a ticket',
    onPress: () => router.push('/(sales)/raise-ticket'),
  };

  return (
    <TabBarInsetProvider>
      <Tabs
        tabBar={(props) => (
          <AppTabBar {...props} items={TAB_ITEMS} theme="dock" action={action} hidden={hideDock} />
        )}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#F3F2FD' } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
        <Tabs.Screen name="raise-ticket" options={{ title: 'Raise' }} />
        <Tabs.Screen name="profile" options={{ title: 'You' }} />
      </Tabs>
    </TabBarInsetProvider>
  );
}
