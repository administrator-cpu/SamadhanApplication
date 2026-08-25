// src/components/ui/IconBadge.js
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function IconBadge({ icon, color = '#94A3B8', bg = 'bg-slate-100', size = 32 }) {
  const iconSize = Math.round(size * 0.45);
  return (
    <View
      className={`items-center justify-center rounded-full ${bg}`}
      style={{ width: size, height: size }}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </View>
  );
}