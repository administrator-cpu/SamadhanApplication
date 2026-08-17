// app/(admin)/_layout.js
import { Tabs, useSegments } from 'expo-router';
import { View, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Route name -> Feather icon, kept as a lookup rather than per-Screen
// tabBarIcon options since the custom tab bar below reads it directly
// off `route.name` instead of relying on React Navigation's icon slot.
const TAB_ICONS = {
  index: 'grid',
  tickets: 'list',
  staff: 'users',
  customers: 'briefcase',
  profile: 'user',
  reports: 'bar-chart-2',
};

function FloatingPillTabBar({ state, descriptors, navigation }) {
  return (
    <View
      className="bg-white rounded-full shadow-lg border border-slate-100 flex-row justify-between items-center px-4 py-3"
      style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const iconName = TAB_ICONS[route.name] || 'circle';
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

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.75}
            onPress={onPress}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            className={`flex-row items-center rounded-full ${
              isFocused ? 'bg-primary-50 px-3 py-2' : 'px-2.5 py-2'
            }`}
          >
            <Feather name={iconName} size={20} color={isFocused ? '#C0703A' : '#94A3B8'} />
            {isFocused && (
              <Text
                numberOfLines={1}
                className="font-sans-semibold text-primary-500 text-xs ml-1.5"
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

export default function AdminTabsLayout() {
  // Expo Router's own segments array, e.g. ['(admin)', 'tickets', '[id]']
  // while viewing a ticket's chat thread. This replaces the earlier
  // getFocusedRouteNameFromRoute approach — SDK 56+ decoupled Expo
  // Router from a direct @react-navigation/native dependency, so pulling
  // that package in directly is no longer safe to rely on.
  const segments = useSegments();
  const hideTabBar = segments.includes('[id]');

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (hideTabBar ? null : <FloatingPillTabBar {...props} />)}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Tabs.Screen name="staff" options={{ title: 'Staff' }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}