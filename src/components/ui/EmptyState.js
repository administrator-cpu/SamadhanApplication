// src/components/ui/EmptyState.js
import { Text, View } from 'react-native';
import IconBadge from './IconBadge';

export default function EmptyState({
  icon = 'coffee',
  title = 'Nothing here yet',
  subtitle,
  size = 96,
}) {
  return (
    <View className="items-center justify-center py-20 px-10">
      <View className="mb-6">
        <IconBadge icon={icon} bg="bg-slate-100" color="#94A3B8" size={size} />
      </View>
      <Text className="font-sans-semibold text-slate-900 text-lg mb-2 text-center">{title}</Text>
      {subtitle ? (
        <Text className="font-sans text-slate-500 text-center leading-relaxed">{subtitle}</Text>
      ) : null}
    </View>
  );
}