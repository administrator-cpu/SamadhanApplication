// app/(sales)/_layout.js
// Two-object dock (34a): a slim ink capsule carries navigation, a wide violet
// pill carries the action — so "Raise a ticket on behalf of a customer" never
// competes with the tabs. Matches the bento palette of the sales screens.
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  ground: '#F3F2FD',
  ink: '#151233',
  inkOnDark: '#8F8BC0',
  violet: '#6C5CE7',
};

// Order here is the visual order in the capsule; 'raise-ticket' is pulled out
// into its own pill and is never rendered as a tab slot.
const NAV = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'tickets', label: 'Tickets', icon: 'inbox' },
  { name: 'profile', label: 'You', icon: 'user' },
];

function SalesDock({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeName = state.routes[state.index]?.name;

  const go = (name) => {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (activeName !== name && !event.defaultPrevented) navigation.navigate(name);
  };

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.capsule}>
        {NAV.map((tab) => {
          const focused = activeName === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => go(tab.name)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={focused ? { selected: true } : {}}
              hitSlop={6}
              style={({ pressed }) => [
                styles.slot,
                focused && styles.slotActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Feather name={tab.icon} size={18} color={focused ? '#FFFFFF' : C.inkOnDark} />
              {focused && <Text style={styles.slotLabel}>{tab.label}</Text>}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/(sales)/raise-ticket')}
        accessibilityRole="button"
        accessibilityLabel="Raise a ticket"
        style={({ pressed }) => [styles.action, pressed && { opacity: 0.9 }]}
      >
        <Feather name="plus" size={17} color="#FFFFFF" />
        <Text style={styles.actionText}>Raise</Text>
      </Pressable>
    </View>
  );
}

export default function SalesTabsLayout() {
  const segments = useSegments();
  const hideDock = segments.includes('[id]') || segments.includes('raise-ticket');

  return (
    <Tabs
      tabBar={(props) => (true ? null : <SalesDock {...props} />)}
      screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: C.ground } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="raise-ticket" options={{ title: 'Raise' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}

const shadow = (color, opacity, radius, y, elevation) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation },
  });

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: C.ink,
    borderRadius: 999,
    padding: 6,
    ...shadow(C.ink, 0.22, 26, 12, 10),
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    width: 40,
    borderRadius: 999,
  },
  slotActive: { width: 'auto', paddingHorizontal: 15, backgroundColor: C.violet },
  slotLabel: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  action: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 120,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: C.violet,
    ...shadow(C.violet, 0.34, 26, 12, 8),
  },
  actionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
