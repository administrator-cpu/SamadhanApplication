// src/components/OfflineBanner.js
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { TopInset } from './layout/Screen';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected can be null briefly during startup — only show the
      // banner when we're confident the device is actually offline.
      setIsOffline(state.isConnected === false);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <TopInset className="absolute top-0 left-0 right-0 z-50 bg-[#dc2626]">
      <View className="flex-row items-center justify-center gap-2 py-2">
        <Feather name="wifi-off" size={14} color="#ffffff" />
        <Text className="text-white text-[13px] font-semibold">No internet connection</Text>
      </View>
    </TopInset>
  );
}
