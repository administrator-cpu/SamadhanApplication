// src/components/ui/StatusBadge.js
import { Text, View } from 'react-native';
import { getStatusStyle, statusLabel } from '../../utils/ticketStatus';

export default function StatusBadge({ status, size = 'md' }) {
  const { bg, text } = getStatusStyle(status);
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5'
      : 'px-2.5 py-1';
  const textSizeClasses = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

  return (
    <View className={`rounded-full ${sizeClasses} ${bg}`}>
      <Text className={`font-sans-semibold ${textSizeClasses} uppercase ${text}`}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}