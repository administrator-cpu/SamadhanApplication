// src/components/ui/LoadingState.js
import { ActivityIndicator, Text, View } from 'react-native';

export default function LoadingState({ label = 'Loading...' }) {
  return (
    <View className="flex-1 items-center justify-center bg-slate-50">
      <ActivityIndicator size="large" color="#FF5A36" />
      {label ? <Text className="font-sans-medium text-slate-500 mt-4">{label}</Text> : null}
    </View>
  );
}