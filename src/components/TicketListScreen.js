// src/components/TicketListScreen.js
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import { SkeletonList } from './ui/SkeletonCard';

import { useTickets, useEscalatedTickets } from '../hooks/useTickets';
import { useStatusGroupCount } from '../hooks/useStatusGroupCount';
import { haptics } from '../utils/haptics';
import { useAuthStore } from '../store/authStore';
import { TicketCard, C, AVATAR_BG_CLASS, AVATAR_INK_CLASS, initialsOf, paletteIndex } from './TicketCard';
import Screen, { ScreenFlatList } from './layout/Screen';
import CustomerSettingsSheet from './CustomerSettingsSheet';
import TicketSearchFilterBar, { DEFAULT_STATUS_OPTIONS } from './TicketSearchFilterBar';

const SEGMENTS = [
  { id: 'ALL', label: 'All', statuses: null },
  { id: 'NEEDS_WORK', label: 'Need work', statuses: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] },
  { id: 'DONE', label: 'Done', statuses: ['RESOLVED', 'CLOSED'] },
];

/* ---------------------------------------------------------------- */
/* Main screen                                                       */
/* ---------------------------------------------------------------- */

export default function TicketListScreen({ basePath, statusGroup, ownership }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Segment tabs and the filter-menu are mutually exclusive ways of
  // narrowing by status: picking one clears the other.
  const activeStatuses =
    statusFilter.length > 0
      ? statusFilter
      : SEGMENTS.find((s) => s.id === activeSegment)?.statuses ?? null;

  const effectiveStatus = activeStatuses && activeStatuses.length === 1 ? activeStatuses[0] : undefined;

  const handleSegmentChange = useCallback((id) => {
    haptics.light();
    setActiveSegment(id);
    setStatusFilter([]);
  }, []);

  const handleStatusFilterChange = useCallback((next) => {
    setStatusFilter(next);
    if (next.length > 0) setActiveSegment('ALL');
  }, []);

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
    status: effectiveStatus,
    searchQuery: debouncedQuery || undefined,
    statusGroup,
    ownership,
  });

  // Global, filter-independent — doesn't move when the tab changes.
  const { total: needsWorkCount } = useStatusGroupCount(['OPEN', 'IN_PROGRESS', 'ESCALATED']);
  const { total: doneCount } = useStatusGroupCount(['RESOLVED', 'CLOSED']);
  const { total: atRiskCount } = useStatusGroupCount(['ESCALATED']);
  const { data: escalatedData } = useEscalatedTickets({ limit: 5 });
  const atRiskTickets = escalatedData?.tickets ?? [];

  const rawTickets = useMemo(() => data?.pages.flatMap((page) => page.tickets) ?? [], [data?.pages]);

  const tickets = useMemo(() => {
    if (activeStatuses && activeStatuses.length > 1) {
      return rawTickets.filter((t) => activeStatuses.includes(t.status));
    }
    return rawTickets;
  }, [rawTickets, activeStatuses]);

  const riskAssignees = useMemo(() => {
    const seen = new Map();
    atRiskTickets.forEach((t) => {
      const name = t.assigned_employee_name?.trim();
      if (name && !seen.has(name)) seen.set(name, true);
    });
    return Array.from(seen.keys()).slice(0, 3);
  }, [atRiskTickets]);

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
  }, [activeSegment, debouncedQuery, statusFilter]);

  const handleTicketPress = useCallback((id) => router.push(`${basePath}/${id}`), [basePath, router]);

  const handleStartTriage = useCallback(() => {
    if (atRiskTickets[0]) {
      haptics.light();
      handleTicketPress(atRiskTickets[0].id);
    }
  }, [atRiskTickets, handleTicketPress]);

  const showListSkeleton = isLoading && !data;
  const segmentLabel = SEGMENTS.find((s) => s.id === activeSegment)?.label ?? 'All';

  const contentRows = showListSkeleton
    ? [{ _type: 'skeleton', _key: 'skeleton' }]
    : isError
      ? [{ _type: 'error', _key: 'error' }]
      : tickets.length === 0
        ? [{ _type: 'empty', _key: 'empty' }]
        : [
          { _type: 'listMeta', _key: 'listMeta' },
          ...tickets.map((t) => ({ _type: 'ticket', _key: String(t.id), ticket: t })),
        ];

  const listData = [
    { _type: 'summary', _key: 'summary' },
    { _type: 'stickyBar', _key: 'stickyBar' },
    ...contentRows,
  ];

  const renderItem = useCallback(
    ({ item, index }) => {
      switch (item._type) {
        case 'summary':
          return (
            <SummaryHeader
              user={user}
              atRiskCount={atRiskCount}
              needsWorkCount={needsWorkCount}
              doneCount={doneCount}
              riskAssignees={riskAssignees}
              onStartTriage={handleStartTriage}
            />
          );
        case 'stickyBar':
          return (
            <StickyBar
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              activeSegment={activeSegment}
              setActiveSegment={handleSegmentChange}
              statusFilter={statusFilter}
              setStatusFilter={handleStatusFilterChange}
            />
          );
        case 'listMeta':
          return (
            <Text
              className="font-sans text-[12px] px-[12px] std:px-[16px] mb-[10px] text-[#9D9AC0]"
            >
              {segmentLabel} · {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
              {statusFilter.length > 0 ? ' · filtered' : ''} · last updated first
            </Text>
          );
        case 'skeleton':
          return (
            <View className="px-[12px] std:px-[16px] pt-[6px]">
              <SkeletonList count={6} />
            </View>
          );
        case 'error':
          return (
            <ErrorState
              title="Unable to load tickets"
              message={error?.message || 'Please check your connection and try again.'}
              onRetry={refetch}
            />
          );
        case 'empty':
          return <AllClear query={debouncedQuery} segment={activeSegment} hasFilter={statusFilter.length > 0} />;
        case 'ticket':
          return (
            <TicketCard
              ticket={item.ticket}
              index={index - 3}
              role={user?.role}
              onPress={() => handleTicketPress(item.ticket.id)}
            />
          );
        default:
          return null;
      }
    },
    [
      user,
      atRiskCount,
      needsWorkCount,
      doneCount,
      riskAssignees,
      handleStartTriage,
      searchInput,
      activeSegment,
      handleSegmentChange,
      segmentLabel,
      tickets,
      statusFilter,
      handleStatusFilterChange,
      error,
      refetch,
      debouncedQuery,
      handleTicketPress,
    ]
  );

  return (
    <Screen className="bg-[#F3F2FD]">
      <ScreenFlatList
        data={listData}
        keyExtractor={(item) => item._key}
        stickyHeaderIndices={[1]}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              haptics.light();
              refetch();
            }}
            tintColor={C.violet}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6 items-center">
              <ActivityIndicator color={C.violet} />
            </View>
          ) : hasNextPage ? (
            <View className="px-4 pt-2 pb-6">
              <TouchableOpacity
                onPress={() => {
                  haptics.light();
                  fetchNextPage();
                }}
                activeOpacity={0.85}
                className="items-center justify-center h-[46px] rounded-[999px] border bg-[#FFFFFF] border-[#EBE8FF]"
              >
                <Text className="font-sans-semibold text-[13px] text-[#151233]">
                  Load more
                </Text>
              </TouchableOpacity>
            </View>
          ) : tickets.length > 0 ? (
            <View className="items-center py-6">
              <Text className="font-sans text-[11.5px] text-[#9D9AC0]">
                You're all caught up
              </Text>
            </View>
          ) : (
            <View className="h-4" />
          )
        }
      />
    </Screen>
  );
}

/* ---------------------------------------------------------------- */
/* SummaryHeader                                                     */
/* ---------------------------------------------------------------- */

function SummaryHeader({ user, atRiskCount, needsWorkCount, doneCount, riskAssignees, onStartTriage }) {
  const firstName = user?.name?.split(' ')[0] || 'there';
  const [settingsVisible, setSettingsVisible] = useState(false);

  const subline =
    atRiskCount > 0
      ? `${atRiskCount} escalated ticket${atRiskCount > 1 ? 's' : ''} need attention`
      : 'All clear right now';

  return (
    <View className="px-[12px] std:px-[16px] pt-[12px] gap-[14px] pb-[14px]">
      <View className="flex-row items-center gap-[11px]">
        <View
          className="items-center justify-center w-[44px] h-[44px] rounded-[999px] bg-[#E6E1FF]"
        >
          <Text className="font-sans-semibold text-[15px] text-[#4A34C7]">
            {(user?.name?.[0] || 'A').toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="font-sans-semibold text-[17px] text-[#151233]" numberOfLines={1}>
            Hello, {firstName}
          </Text>
          <Text className="font-sans text-[11.5px] mt-[2px] text-[#6D6A96]" numberOfLines={1}>
            {subline}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          className="items-center justify-center shadow-sm w-[40px] h-[40px] rounded-[999px] bg-[#FFFFFF]"
          onPress={() => setSettingsVisible(true)}
        >
          <Feather name="settings" size={18} color={C.ink} />
          {atRiskCount > 0 && (
            <View
              className="absolute top-[8px] right-[9px] w-[8px] h-[8px] rounded-[999px] border-[2px] border-[#FFFFFF] bg-[#6C5CE7]"
            />
          )}
        </TouchableOpacity>
      </View>

      <CustomerSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <View className="rounded-[30px] p-[20px] overflow-hidden bg-[#6C5CE7]">
        <View
          className="absolute right-[-40px] top-[-46px] w-[150px] h-[150px] rounded-[999px] bg-[#8271EF]"
        />
        <View
          className="absolute right-[26px] bottom-[-56px] w-[110px] h-[110px] rounded-[999px] bg-[#5A48D6]"
        />
        <Text
          className="font-sans-semibold text-[10px] tracking-[1.2px] uppercase text-[#E6E1FF]"
        >
          {atRiskCount > 0 ? 'Triage first' : 'Desk status'}
        </Text>
        <View className="flex-row items-end gap-[8px] mt-[6px] mb-[4px]">
          <Text className="font-sans-semibold text-[44px] leading-[46px] text-[#FFFFFF]">
            {atRiskCount}
          </Text>
          <Text className="font-sans-semibold text-[15px] pb-[7px] text-[#E6E1FF]">
            ticket{atRiskCount === 1 ? '' : 's'} escalated
          </Text>
        </View>
        <Text
          className="font-sans text-[13px] leading-[19px] max-w-[220px] mb-[16px] text-[#E6E1FF]"
        >
          {atRiskCount === 0
            ? 'Nothing escalated right now. You are ahead of the desk.'
            : `${atRiskCount} escalated ticket${atRiskCount > 1 ? 's' : ''} needing a response right now.`}
        </Text>

        <View className="flex-row items-center gap-[10px]">
          <TouchableOpacity
            onPress={onStartTriage}
            activeOpacity={0.85}
            className="flex-row items-center rounded-[999px] px-[18px] min-h-[44px] gap-[8px] bg-[#151233]"
          >
            <Text className="font-sans-semibold text-[13px] text-[#F3F2FD]">
              {atRiskCount > 0 ? 'Start triage' : 'Review queue'}
            </Text>
            <Feather name="arrow-right" size={15} color={C.bg} />
          </TouchableOpacity>

          {riskAssignees.length > 0 && (
            <View className="flex-row">
              {riskAssignees.map((name, i) => {
                const idx = paletteIndex(name);
                return (
                  <View
                    key={name}
                    className={`items-center justify-center w-[32px] h-[32px] rounded-[999px] border-[2px] ${i > 0 ? 'ml-[-8px]' : 'ml-0'} border-[#6C5CE7] ${AVATAR_BG_CLASS[idx]}`}
                  >
                    <Text className={`font-sans-semibold text-[10px] ${AVATAR_INK_CLASS[idx]}`}>
                      {initialsOf(name)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View className="flex-row gap-[11px]">
        <View className="flex-1 rounded-[24px] px-[12px] std:px-[16px] pt-[16px] pb-[14px] bg-[#CCF7E4]">
          <Text className="font-sans-semibold text-[32px] leading-[34px] text-[#0D6B4B]">
            {needsWorkCount}
          </Text>
          <Text
            className="font-sans-semibold text-[10px] tracking-[1px] uppercase mt-[5px] text-[#0F7A56]"
          >
            Need work
          </Text>
        </View>
        <View className="flex-1 rounded-[24px] px-[12px] std:px-[16px] pt-[16px] pb-[14px] bg-[#FFD166]">
          <Text className="font-sans-semibold text-[32px] leading-[34px] text-[#6B4800]">
            {doneCount}
          </Text>
          <Text
            className="font-sans-semibold text-[10px] tracking-[1px] uppercase mt-[5px] text-[#7A5200]"
          >
            Done
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* StickyBar                                                          */
/* ---------------------------------------------------------------- */

function StickyBar({
  searchInput,
  setSearchInput,
  activeSegment,
  setActiveSegment,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <View className="px-[12px] std:px-[16px] pt-[8px] pb-[12px] gap-[12px] bg-[#F3F2FD]">
      <TicketSearchFilterBar
        searchValue={searchInput}
        onChangeSearch={setSearchInput}
        selectedStatuses={statusFilter}
        onChangeStatuses={setStatusFilter}
        statusOptions={DEFAULT_STATUS_OPTIONS}
        placeholder="Search ticket no., subject, assignee..."
      />

      <View className="flex-row rounded-[999px] p-[5px] gap-[3px] bg-[#151233]">
        {SEGMENTS.map((segment) => {
          const isActive = activeSegment === segment.id;
          return (
            <TouchableOpacity
              key={segment.id}
              onPress={() => setActiveSegment(segment.id)}
              activeOpacity={0.85}
              className={`flex-1 flex-row items-center justify-center rounded-[999px] py-[10px] ${isActive ? 'bg-[#FDF8EE]' : 'bg-transparent'}`}
            >
              <Text
                className={`font-sans-semibold text-[13px] ${isActive ? 'text-[#151233]' : 'text-[#C0B6A5]'}`}
                numberOfLines={1}
              >
                {segment.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Empty state                                                       */
/* ---------------------------------------------------------------- */

function AllClear({ query, segment, hasFilter }) {
  if (query) {
    return (
      <EmptyState
        icon="search"
        title="Nothing matched"
        subtitle={`We couldn't find anything matching "${query}".`}
      />
    );
  }
  const label = SEGMENTS.find((s) => s.id === segment)?.label ?? 'this view';
  return (
    <View
      className="rounded-[26px] mx-[12px] std:mx-[16px] py-[34px] px-[24px] items-center bg-[#CCF7E4]"
    >
      <View
        className="items-center justify-center w-[56px] h-[56px] rounded-[999px] mb-[14px] bg-[#F3F2FD]"
      >
        <Feather name="coffee" size={22} color={C.mintInk2} />
      </View>
      <Text className="font-sans-semibold text-[19px] mb-[4px] text-[#0D6B4B]">
        All clear
      </Text>
      <Text className="font-sans text-[13px] text-center text-[#0F7A56]">
        {hasFilter ? `Nothing matches the selected filter in ${label}.` : `Nothing in ${label} right now.`}
      </Text>
    </View>
  );
}