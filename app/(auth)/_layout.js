import { Stack, Tabs } from 'expo-router';
// Using the native version of Lucide icons from your web project
import { House, Search, ShoppingCart, User } from 'lucide-react-native';

/**
 * Bottom Tab Navigation Layout
 * This is the main shell for guests and logged-in users.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}