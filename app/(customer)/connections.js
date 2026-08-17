// app/(customer)/connections.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyConnections } from '../../src/hooks/useCustomers';

export default function MyConnections() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyConnections();
  const [refreshing, setRefreshing] = useState(false);

  const connections = data?.connections || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refetch) await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#292524" />
        <Text className="font-sans-semibold text-slate-500 text-sm mt-3.5">
          Fetching connections...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="pt-12 pb-6 px-6">
        <Text className="font-sans-semibold text-slate-900 text-3xl">Connections</Text>
        <Text className="font-sans-medium text-slate-500 text-sm mt-1.5">
          Select a service to raise a support ticket
        </Text>
      </View>

      <FlatList
        data={connections}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5A36" />
        }
        renderItem={({ item }) => {
          const isActive = (item.status || 'Active').toLowerCase() === 'active';

          // High-density meta line — only include parts that exist, so
          // stray dots never show up next to missing data.
          const metaParts = [
            item.serviceType || 'Unknown',
            item.bandwidth ? `${item.bandwidth} Mbps` : null,
            item.installationCode || item.aEndBtsId || null,
          ].filter(Boolean);

          return (
            <Pressable
              onPress={() =>
                router.push(`/(customer)/raise-ticket?circuitId=${encodeURIComponent(item.fabCircuitId)}`)
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              className="mb-3"
            >
              <View className="bg-white rounded-2xl p-4 flex-row items-center shadow-sm border border-slate-200">
                {/* Icon + status dot */}
                <View className="relative mr-4">
                  <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center">
                    <Feather name="server" size={20} color="#FF5A36" />
                  </View>
                  <View
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-white ${
                      isActive ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </View>

                {/* Info */}
                <View className="flex-1 justify-center pr-2">
                  <Text
                    className="font-sans-semibold text-lg text-slate-800 mb-1.5"
                    numberOfLines={1}
                  >
                    {item.fabCircuitId}
                  </Text>

                  <View className="flex-row flex-wrap items-center">
                    {metaParts.map((part, index) => (
                      <View key={`${part}-${index}`} className="flex-row items-center">
                        {index > 0 && <Text className="text-slate-300 text-xs mx-1.5">•</Text>}
                        <Text
                          className="font-sans-medium text-slate-500 text-xs"
                          numberOfLines={1}
                        >
                          {part}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Chevron */}
                <Feather name="chevron-right" size={20} color="#CBD5E1" />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-8">
            <View className="w-22 h-22 rounded-full bg-slate-100 items-center justify-center mb-6" style={{ width: 88, height: 88, borderRadius: 44 }}>
              <MaterialCommunityIcons
                name={isError ? 'alert-circle-outline' : 'lan-disconnect'}
                size={40}
                color="#78716C"
              />
            </View>
            <Text className="font-sans-semibold text-slate-800 text-lg mb-2.5">
              {isError ? 'Unable to connect' : 'No connections found'}
            </Text>
            <Text className="font-sans-medium text-slate-500 text-sm text-center leading-6">
              {isError
                ? 'Please pull down to refresh the list.'
                : "You don't have any active services right now."}
            </Text>
          </View>
        }
      />
    </View>
  );
}