// src/components/TicketListScreen.js
import React, { useState, useEffect, useCallback, memo } from 'react';
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
import { STATUS_STYLES, statusLabel } from '../utils/ticketStatus';

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];

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
    }, 500);
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

  const tickets = data?.pages.flatMap((page) => page.tickets) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Use useCallback so the reference doesn't change on every render
  const renderItem = useCallback(({ item }) => (
    <MemoizedTicketCard 
      ticket={item} 
      onPress={() => router.push(`${basePath}/${item.id}`)} 
    />
  ), [basePath, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-4 font-medium">Loading tickets...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Feather name="alert-triangle" size={48} color="#ef4444" className="mb-4" />
        <Text className="text-gray-900 font-bold text-lg mb-2">Failed to load tickets</Text>
        <Text className="text-gray-500 text-center mb-6">
          {error?.message || 'Please check your connection and try again.'}
        </Text>
        <Pressable 
          onPress={() => refetch()} 
          className="bg-blue-600 rounded-xl px-6 py-3 flex-row items-center"
        >
          <Feather name="refresh-cw" size={16} color="white" className="mr-2" />
          <Text className="text-white font-semibold">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center bg-gray-100/80 border border-gray-200 rounded-xl px-3 h-12">
          <Feather name="search" size={18} color="#6b7280" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search ticket number..."
            placeholderTextColor="#9ca3af"
            className="flex-1 px-3 py-2 text-base text-gray-900"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} className="p-1">
              <Feather name="x-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Status Filter Chips */}
      <View className="bg-white pb-3">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}
          renderItem={({ item }) => {
            const isActive = statusFilter === item;
            return (
              <Pressable
                onPress={() => setStatusFilter(item)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                className={`px-4 py-2 rounded-full border ${
                  isActive 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <Text className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}>
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
        // FIX 1: Combine ID and index to completely protect against backend duplicate ID crashes
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        
        // FIX 2: FlatList Performance Optimizations to prevent freezing
        initialNumToRender={8} // Only render first 8 items immediately
        maxToRenderPerBatch={8} // Render in small chunks
        windowSize={5} // Keep less items in memory outside the visible screen
        removeClippedSubviews={true} // Unmount components that are off-screen

        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="inbox" size={28} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-1">No tickets found</Text>
            <Text className="text-gray-500 text-center max-w-[250px]">
              {debouncedQuery 
                ? `No results match "${debouncedQuery}" in ${safeStatusLabel(statusFilter)}.` 
                : 'There are no tickets matching this filter.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6 items-center">
              <ActivityIndicator color="#3b82f6" />
            </View>
          ) : (
            <View className="h-10" />
          )
        }
      />
    </View>
  );
}

// FIX 3: Wrap the TicketCard in React.memo() so it doesn't re-render unless its specific props change
const MemoizedTicketCard = memo(function TicketCard({ ticket, onPress }) {
  const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.CLOSED;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      className="bg-white rounded-2xl mb-3 p-4 shadow-sm border border-gray-100 flex-row items-center justify-between"
    >
      <View className="flex-1 mr-4">
        <View className="flex-row items-center gap-x-2 mb-1.5">
          <Text className="text-gray-900 font-bold text-base tracking-tight">
            #{ticket.ticket_no}
          </Text>
          <View className={`px-2 py-0.5 rounded-md ${style.bg}`}>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
              {statusLabel(ticket.status)}
            </Text>
          </View>
        </View>
        <Text 
          className="text-gray-500 text-sm leading-5" 
          numberOfLines={2} 
          ellipsizeMode="tail"
        >
          {ticket.circuit_description || 'No description provided for this ticket.'}
        </Text>
      </View>

      <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center">
        <Feather name="chevron-right" size={18} color="#9ca3af" />
      </View>
    </Pressable>
  );
});