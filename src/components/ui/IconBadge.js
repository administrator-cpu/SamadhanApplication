// src/components/ui/IconBadge.js
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SIZE_CLASSES = {
  24: 'w-[24px] h-[24px]',
  32: 'w-[32px] h-[32px]',
  40: 'w-[40px] h-[40px]',
  48: 'w-[48px] h-[48px]',
  56: 'w-[56px] h-[56px]',
  64: 'w-[64px] h-[64px]',
  72: 'w-[72px] h-[72px]',
  80: 'w-[80px] h-[80px]',
  96: 'w-[96px] h-[96px]',
};

export default function IconBadge({ icon, color = '#94A3B8', bg = 'bg-slate-100', size = 32 }) {
  const iconSize = Math.round(size * 0.45);
  return (
    <View
      className={`items-center justify-center rounded-full ${bg} ${SIZE_CLASSES[size] ?? SIZE_CLASSES[32]}`}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </View>
  );
}