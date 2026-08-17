// app/(customer)/_layout.jsx
import { View, Text, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE_COLOR = '#FF5A36';
const INACTIVE_COLOR = '#948A7C';

// Routes that exist as real screens (reachable via router.push from the
// dashboard grid, deep links, etc.) but should NOT render as a tab in the
// floating pill. Checked explicitly by name rather than relying solely on
// `options.href === null`, since that flag is also used by expo-router for
// other routing purposes and mixing concerns made the bar's item count
// (and therefore its width math) less predictable — which was contributing
// to the tap lag alongside the sheer number of items.
const HIDDEN_FROM_TAB_BAR = ['connections', 'analytics', 'support-guidelines'];

/* ---------------------------------------------------------------- */
/* Custom Floating Tab Bar Component                                */
/* ---------------------------------------------------------------- */

function FloatingTabBar({ state, descriptors, navigation, insets }) {
  const visibleRoutes = state.routes.filter(
    (route) => !HIDDEN_FROM_TAB_BAR.includes(route.name)
  );

  return (
    <View
      className="absolute left-4 right-4 bg-surface rounded-full flex-row justify-between items-center px-6 py-3 shadow-lg border border-border/40"
      style={{ bottom: insets.bottom > 0 ? insets.bottom : 16 }}
    >
      {visibleRoutes.map((route) => {
        // Look up this route's real index in the full route list — needed
        // because `state.index` (which tab is active) is based on the
        // FULL route array, not the filtered visible one.
        const index = state.routes.findIndex((r) => r.key === route.key);
        const { options } = descriptors[route.key];
        const label = options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const color = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={label}
            className={`flex-row items-center justify-center rounded-full px-3 py-2 ${
              isFocused ? 'bg-primary-50' : 'bg-transparent'
            }`}
          >
            {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color, size: 20 })}

            {isFocused && (
              <Text
                className="font-sans-semibold text-primary-600 text-[11px] ml-1.5"
                numberOfLines={1}
              >
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Layout Configuration                                             */
/* ---------------------------------------------------------------- */

export default function CustomerTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} insets={insets} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="raise-ticket"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, size }) => <Feather name="plus-circle" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={20} color={color} />,
        }}
      />

      {/* Still real, navigable screens — just excluded from the tab bar
          via HIDDEN_FROM_TAB_BAR above. Reachable from the dashboard's
          action grid (My Connection / Analytics tiles) or any router.push. */}
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Connection',
          tabBarIcon: ({ color, size }) => <Ionicons name="wifi-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="support-guidelines"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}