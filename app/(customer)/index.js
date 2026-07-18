// app/(customer)/index.js
import { View, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function CustomerDashboard() {
  const user = useAuthStore((state) => state.user);
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg">Welcome, {user?.name}</Text>
    </View>
  );
}