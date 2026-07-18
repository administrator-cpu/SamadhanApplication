import { View, Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function SalesDashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg">Welcome, {user?.name}</Text>
      <Text className="text-gray-500 mt-1">Sales Dashboard</Text>
    </View>
  );
}