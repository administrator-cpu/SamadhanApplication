// src/api/queryClient.js
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

let mmkvStorage = null;
try {
  const { MMKV } = require('react-native-mmkv');
  mmkvStorage = new MMKV({ id: 'query-cache' });
} catch (e) {
  mmkvStorage = null; // Expo Go, or a dev client built before mmkv was linked
}

export { mmkvStorage };

const clientStorage = mmkvStorage
  ? {
      setItem: (key, value) => mmkvStorage.set(key, value),
      getItem: (key) => mmkvStorage.getString(key) ?? null,
      removeItem: (key) => mmkvStorage.delete(key),
    }
  : null;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

export const persister = mmkvStorage
  ? createSyncStoragePersister({ storage: clientStorage, key: 'SAMADHAN_QUERY_CACHE_V3' })
  : createAsyncStoragePersister({ storage: AsyncStorage, key: 'SAMADHAN_QUERY_CACHE_V3' });

const PERSIST_KEY_PREFIXES = [
  'tickets',
  'ticket',
  'categories',
  'agents',
  'agent-stats',
  'admin-stats',
  'my-metrics',
  'my-connections',
];

export const persistOptions = {
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      PERSIST_KEY_PREFIXES.includes(query.queryKey[0]) && query.state.status === 'success',
  },
};
