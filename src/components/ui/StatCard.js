// src/components/ui/StatCard.js
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function StatCard({ icon, iconColor, iconBg, value, label, minWidth = 130 }) {
  return (
    <View
      className="bg-white px-4 py-3 rounded-2xl mr-3 shadow-sm border border-slate-200"
      style={{ minWidth }}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center mb-2 ${iconBg}`}>
        <Feather name={icon} size={15} color={iconColor} />
      </View>
      <Text className="font-sans-semibold text-slate-800 text-2xl mt-1">{value ?? '0'}</Text>
      <Text className="font-sans-semibold text-slate-400 text-[10px] mt-0" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}