// src/hooks/useOfflineFlush.js
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export function useOfflineFlush() {
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(!!state.isConnected);
    });
  }, []);
}