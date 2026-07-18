import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';

export default function SalesProfile() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <View className="flex-1 items-center justify-center bg-white gap-4">
      <Text className="text-lg">{user?.name}</Text>
      <Text className="text-gray-500">{user?.email}</Text>
      <Text className="text-gray-400 text-sm">{user?.role}</Text>
      <Pressable onPress={logout} className="bg-red-600 rounded-lg px-6 py-3">
        <Text className="text-white font-semibold">Log Out</Text>
      </Pressable>
    </View>
  );
}