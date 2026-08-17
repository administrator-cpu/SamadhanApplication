// app/(admin)/staff/index.js
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useEmployees } from '../../../src/hooks/useCustomers';

function getInitials(name) {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

export default function StaffScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error, refetch, isRefetching } = useEmployees({
    page,
    limit,
  });

  const employees = data?.employees ?? [];
  const pagination = data?.pagination;
  const hasNextPage = pagination ? page * limit < pagination.total : false;

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => router.push(`/(admin)/staff/${item.employee_row_id}`)}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 flex-row items-center"
    >
      <View className="w-11 h-11 rounded-full bg-primary-50 items-center justify-center mr-3">
        <Text className="font-sans-semibold text-primary-600 text-sm">
          {getInitials(item.name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-slate-900 text-sm" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="font-sans text-slate-500 text-xs mt-0.5" numberOfLines={1}>
          {item.employee_id} · {item.email}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color="#CBD5E1" />
    </Pressable>
  );

  if (isError) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-rose-50 p-4 rounded-full mb-4">
          <Feather name="alert-circle" size={32} color="#E11D48" />
        </View>
        <Text className="font-sans-semibold text-slate-900 text-xl mb-2">
          Unable to load staff
        </Text>
        <Text className="font-sans text-slate-500 text-center mb-8 leading-relaxed px-4">
          {error?.message || 'Please check your connection and try again.'}
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          className="bg-primary-500 px-8 py-4 rounded-full shadow-sm"
        >
          <Text className="font-sans-semibold text-white text-base">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white pt-4 pb-3 px-5 border-b border-slate-200 z-10">
        <Text className="font-sans-semibold text-slate-900 text-3xl">Staff</Text>
      </View>

      <FlatList
        data={employees}
        // Fixed: employee objects don't have an `.id` field — the actual
        // row identifier is `employee_row_id` (confirmed by [id].js's
        // lookup: e.employee_row_id === id). `item.id` was undefined for
        // every row, so every key collapsed to the same "undefined"
        // string — the source of both the duplicate-key warning and the
        // FlatList render error.
        keyExtractor={(item) => String(item.employee_row_id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5A36" />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View className="items-center justify-center py-20 mt-8">
              <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center mb-6">
                <Feather name="users" size={36} color="#94A3B8" />
              </View>
              <Text className="font-sans-semibold text-slate-900 text-lg mb-2">
                No staff members yet
              </Text>
              <Text className="font-sans text-slate-500 text-center px-10 leading-relaxed">
                Employees you add will show up here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#FF5A36" />
            </View>
          ) : pagination ? (
            <View className="flex-row items-center justify-between mt-2 px-1">
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2.5 rounded-full border border-slate-200 ${
                  page === 1 ? 'opacity-40' : 'bg-white'
                }`}
              >
                <Text className="font-sans-semibold text-slate-700 text-sm">Previous</Text>
              </Pressable>

              <Text className="font-sans text-slate-500 text-xs">
                Page {page} of {Math.max(1, Math.ceil(pagination.total / limit))}
              </Text>

              <Pressable
                onPress={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className={`px-4 py-2.5 rounded-full border border-slate-200 ${
                  !hasNextPage ? 'opacity-40' : 'bg-white'
                }`}
              >
                <Text className="font-sans-semibold text-slate-700 text-sm">Next</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}