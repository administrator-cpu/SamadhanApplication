// src/components/TicketListScreen.js
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTickets } from '../hooks/useTickets';
import { TicketCard } from './TicketCard';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

const safeStatusLabel = (status) => {
  if (status === 'ALL') return 'All Tickets';
  // statusLabel import no longer needed here directly — safeStatusLabel
  // for filter chip labels still needs it, so re-import just that helper.
  return status;
};

import { statusLabel } from '../utils/ticketStatus';
function resolveFilterLabel(status) {
  if (status === 'ALL') return 'All Tickets';
  return statusLabel(status) || status;
}

// --- Main Screen Component ---

export default function TicketListScreen({ basePath, statusGroup, ownership }) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useTickets({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    searchQuery: debouncedQuery || undefined,
    statusGroup,
    ownership,
  });

  const tickets = useMemo(() => {
    return data?.pages.flatMap((page) => page.tickets) ?? [];
  }, [data?.pages]);

  const endReachedGuard = useRef(false);

  const handleEndReached = useCallback(() => {
    if (endReachedGuard.current) return;
    if (hasNextPage && !isFetchingNextPage && tickets.length > 0) {
      endReachedGuard.current = true;
      fetchNextPage().finally(() => {
        endReachedGuard.current = false;
      });
    }
  }, [hasNextPage, isFetchingNextPage, tickets.length, fetchNextPage]);

  useEffect(() => {
    endReachedGuard.current = false;
  }, [statusFilter, debouncedQuery]);

  // cutoutColor="#F8FAFC" (slate-50) matches this screen's own background
  // (bg-slate-50 on the outer View below) — this is the value TicketCard
  // already defaults to, passed explicitly here for clarity/safety in case
  // that default ever changes independently of this screen's background.
  const renderItem = useCallback(
    ({ item }) => (
      <TicketCard
        ticket={item}
        onPress={() => router.push(`${basePath}/${item.id}`)}
        cutoutColor="#F8FAFC"
      />
    ),
    [basePath, router]
  );

  const showListSkeleton = isLoading && !data;

  return (
    <View className="flex-1 bg-slate-50">
      <TicketListHeader
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {showListSkeleton ? (
        <View style={{ padding: 20, paddingBottom: 160 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <TicketCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <TicketErrorState error={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ padding: 20, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.1}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF5A36" />
          }
          ListEmptyComponent={<TicketEmptyState debouncedQuery={debouncedQuery} />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#FF5A36" />
              </View>
            ) : (
              <View className="h-4" />
            )
          }
        />
      )}
    </View>
  );
}

// --- Sub-Components (unchanged from previous round) ---

function TicketListHeader({ searchInput, setSearchInput, statusFilter, setStatusFilter }) {
  return (
    <View className="bg-white pt-4 pb-3 border-b border-slate-200 z-10">
      <Text className="font-sans-semibold text-slate-900 text-3xl px-5 mb-3">Tickets</Text>

      <View className="px-5 mb-3">
        <View className="w-full flex-row items-center bg-slate-100 rounded-2xl px-4 ">
          <Feather name="search" size={18} color="#64748B" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by ticket ID or keyword..."
            placeholderTextColor="#94A3B8"
            className="flex-1 h-full ml-2.5 font-sans text-slate-900 text-sm"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchInput.length > 0 && (
            <Pressable
              onPress={() => setSearchInput('')}
              hitSlop={6}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="x-circle" size={17} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      <TicketFilterChips statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
    </View>
  );
}

function TicketFilterChips({ statusFilter, setStatusFilter }) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={STATUS_FILTERS}
      keyExtractor={(item) => item}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      renderItem={({ item }) => {
        const isActive = statusFilter === item;
        return (
          <Pressable
            onPress={() => setStatusFilter(item)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            className={`px-4 py-2 rounded-full ${
              isActive ? 'bg-primary-500' : 'bg-white border border-slate-200'
            }`}
          >
            <Text
              className={`font-sans-semibold text-xs ${
                isActive ? 'text-white' : 'text-slate-500'
              }`}
            >
              {resolveFilterLabel(item)}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function TicketErrorState({ error, onRetry }) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="bg-rose-50 p-4 rounded-full mb-4">
        <Feather name="alert-circle" size={32} color="#E11D48" />
      </View>
      <Text className="font-sans-semibold text-slate-900 text-xl mb-2">Unable to load tickets</Text>
      <Text className="font-sans text-slate-500 text-center mb-8 leading-relaxed px-4">
        {error?.message || 'Please check your connection and try again.'}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        className="bg-primary-500 px-8 py-4 rounded-full shadow-sm"
      >
        <Text className="font-sans-semibold text-white text-base">Try Again</Text>
      </Pressable>
    </View>
  );
}

function TicketEmptyState({ debouncedQuery }) {
  return (
    <View className="items-center justify-center py-20 mt-8">
      <View className="w-24 h-24 rounded-full bg-slate-100 items-center justify-center mb-6">
        <Feather name="coffee" size={36} color="#94A3B8" />
      </View>
      <Text className="font-sans-semibold text-slate-900 text-lg mb-2">No tickets found</Text>
      <Text className="font-sans text-slate-500 text-center px-10 leading-relaxed">
        {debouncedQuery
          ? `We couldn't find anything matching "${debouncedQuery}".`
          : 'You are all caught up! There are no tickets here.'}
      </Text>
    </View>
  );
}

function TicketCardSkeleton() {
  return (
    <View
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
      className="bg-white rounded-2xl mb-4 overflow-hidden"
    >
      <View className="p-4">
        <View className="flex-row justify-between mb-2">
          <View className="w-2/3 h-4 rounded-full bg-slate-100" />
          <View className="w-14 h-3 rounded-full bg-slate-100" />
        </View>
        <View className="w-1/2 h-3 rounded-full bg-slate-100" />
      </View>
      <View className="border-t-2 border-dashed border-slate-200" />
      <View className="bg-slate-50/50 px-4 py-3 flex-row justify-between">
        <View className="w-16 h-5 rounded-full bg-slate-100" />
        <View className="w-24 h-3 rounded-full bg-slate-100" />
      </View>
    </View>
  );
}