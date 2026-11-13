// src/components/ui/FilterChip.js
import { Pressable, Text } from 'react-native';
import { DENSE_FONT_SCALE } from '../layout/tokens';

export default function FilterChip({ label, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 min-h-[44px] justify-center rounded-full active:opacity-80 ${
        isActive ? 'bg-primary-500' : 'bg-white border border-slate-200'
      }`}
    >
      <Text
        maxFontSizeMultiplier={DENSE_FONT_SCALE}
        className={`font-sans-semibold text-xs ${isActive ? 'text-white' : 'text-slate-500'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}