// src/components/ui/SkeletonCard.js
import { View } from 'react-native';

export default function SkeletonCard({ rows = 3, showStub = true }) {
  return (
    <View className="bg-white rounded-2xl mb-4 overflow-hidden border border-slate-100">
      <View className="p-4" style={{ gap: 8 }}>
        <View className="h-4 w-3/4 bg-slate-100 rounded-md" />
        {Array.from({ length: rows - 1 }).map((_, i) => (
          <View key={i} className="h-3 w-1/2 bg-slate-100 rounded-md" />
        ))}
      </View>
      {showStub && (
        <View className="h-10 bg-slate-50 border-t border-slate-100" />
      )}
    </View>
  );
}

export function SkeletonList({ count = 6, ...rest }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} {...rest} />
      ))}
    </>
  );
}