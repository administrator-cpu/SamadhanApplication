import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AdminTicketDetail() {
  const { id } = useLocalSearchParams();
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text>Ticket #{id} (WIP)</Text>
    </View>
  );
}