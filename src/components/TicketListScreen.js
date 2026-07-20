// src/components/TicketListScreen.js
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTickets } from '../hooks/useTickets';
import { statusLabel } from '../utils/ticketStatus';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

// Upgraded, vibrant badge configurations
const STATUS_CONFIG = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'file-text', iconColor: '#1d4ed8' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'clock', iconColor: '#b45309' },
  ESCALATED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'alert-triangle', iconColor: '#b91c1c' },
  RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check-circle', iconColor: '#047857' },
  CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: 'archive', iconColor: '#475569' },
  REOPENED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'refresh-ccw', iconColor: '#7e22ce' },
};

const safeStatusLabel = (status) => {
  if (status === 'ALL') return 'All Tickets';
  return statusLabel(status) || status;
};

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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }) => (
      <MemoizedTicketCard ticket={item} onPress={() => router.push(`${basePath}/${item.id}`)} />
    ),
    [basePath, router]
  );

  if (isLoading && !data) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-white items-center justify-center p-6">
        <View className="bg-red-50 p-4 rounded-full mb-4">
          <Feather name="alert-circle" size={32} color="#ef4444" />
        </View>
        <Text className="text-xl font-bold text-slate-900 mb-2">Unable to load tickets</Text>
        <Text className="text-slate-500 text-center mb-8">
          {error?.message || 'Please check your connection and try again.'}
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="bg-slate-900 px-8 py-4 rounded-xl active:bg-slate-800"
        >
          <Text className="text-white font-bold text-base">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">

      {/* Sleek Header & Search */}
      <View className="bg-white pt-4 pb-2 px-6 border-b border-slate-100 shadow-sm shadow-slate-100 z-10">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight py-5 mb-4">Tickets</Text>

        <View className="flex-row items-center bg-slate-100 border border-slate-200 rounded-xl px-4 h-12 mb-4">
          <Feather name="search" size={18} color="#64748b" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search by ID or keyword..."
            placeholderTextColor="#94a3b8"
            className="flex-1 h-full ml-3 text-slate-900 text-base font-medium"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} className="bg-slate-200 rounded-full p-1">
              <Feather name="x" size={14} color="#475569" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Modern Filter Chips */}
      <View className="bg-slate-50 pt-3 pb-1">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = statusFilter === item;
            return (
              <Pressable
                onPress={() => setStatusFilter(item)}
                className={`px-5 py-2.5 rounded-full border ${isActive
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-white border-slate-200 active:bg-slate-100'
                  }`}
              >
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>
                  {safeStatusLabel(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Ticket List */}
      <FlatList
        data={tickets}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0f172a" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20 mt-10">
            <View className="bg-slate-100 w-24 h-24 rounded-full items-center justify-center mb-6">
              <Feather name="inbox" size={40} color="#94a3b8" />
            </View>
            <Text className="text-lg font-bold text-slate-900 mb-2">No tickets found</Text>
            <Text className="text-slate-500 text-center px-10">
              {debouncedQuery
                ? `We couldn't find anything matching "${debouncedQuery}".`
                : 'You are all caught up! There are no tickets here.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#0f172a" />
            </View>
          ) : (
            <View className="h-4" />
          )
        }
      />
    </View>
  );
}

// ------------------------------------------------------------------
// UPGRADED CARD COMPONENT
// ------------------------------------------------------------------
const MemoizedTicketCard = memo(function TicketCard({ ticket, onPress }) {
  const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.CLOSED;
  const desc = ticket.circuit_description || 'No description provided';

  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-100 rounded-2xl p-4 mb-3 shadow-sm shadow-slate-100 active:bg-slate-50 active:scale-[0.98]"
    >
      <View className="flex-row items-start gap-4">
        
        {/* Left Column: Bold Status Indicator */}
        <View className={`w-10 h-10 rounded-full items-center justify-center border ${config.bg} ${config.border}`}>
           <Feather name={config.icon} size={16} color={config.iconColor} />
        </View>

        {/* Right Column: Content */}
        <View className="flex-1 justify-center pt-0.5">
           <View className="flex-row justify-between items-center mb-1">
             <Text className={`text-[10px] font-bold uppercase tracking-widest ${config.text}`}>
               {statusLabel(ticket.status)}
             </Text>
             <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               {ticket.ticket_no}
             </Text>
           </View>
           
           <Text className="text-base font-bold text-slate-900 leading-tight" numberOfLines={2}>
             {desc}
           </Text>
        </View>

      </View>
    </Pressable>
  );
});