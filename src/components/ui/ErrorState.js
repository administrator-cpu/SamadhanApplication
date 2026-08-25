// src/components/ui/ErrorState.js
import { Pressable, Text, View } from 'react-native';
import IconBadge from './IconBadge';

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
}) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="mb-4">
        <IconBadge icon="alert-circle" bg="bg-rose-50" color="#E11D48" size={64} />
      </View>
      <Text className="font-sans-semibold text-slate-900 text-xl mb-2 text-center">{title}</Text>
      {message ? (
        <Text className="font-sans text-slate-500 text-center mb-8 leading-relaxed px-4">
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          className="bg-primary-500 px-8 py-4 rounded-full shadow-sm"
        >
          <Text className="font-sans-semibold text-white text-base">{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}