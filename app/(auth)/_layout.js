import { Stack, Tabs } from 'expo-router';
import { House, Search, ShoppingCart, User } from 'lucide-react-native';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}