// src/components/ui/FilterChip.js
import { Pressable, Text } from 'react-native';

export default function FilterChip({ label, isActive, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      className={`px-4 py-2 rounded-full ${
        isActive ? 'bg-primary-500' : 'bg-white border border-slate-200'
      }`}
    >
      <Text
        className={`font-sans-semibold text-xs ${isActive ? 'text-white' : 'text-slate-500'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}