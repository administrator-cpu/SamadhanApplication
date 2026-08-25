// src/components/TicketListScreen.js
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { TicketCard, C, AVATAR_BG, AVATAR_INK, initialsOf, paletteIndex } from './TicketCard';
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
              className="font-sans"
              style={{ fontSize: 12, color: C.inkFaint, paddingHorizontal: 16, marginBottom: 10 }}
            >
              {segmentLabel} · {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
              {statusFilter.length > 0 ? ' · filtered' : ''} · last updated first
            </Text>
          );
        case 'skeleton':
          return (
            <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
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
    <View className="flex-1 mt-[35px]" style={{ backgroundColor: C.bg }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item._key}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
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
                className="items-center justify-center"
                style={{ height: 46, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.track }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.ink }}>
                  Load more
                </Text>
              </TouchableOpacity>
            </View>
          ) : tickets.length > 0 ? (
            <View className="items-center py-6">
              <Text className="font-sans" style={{ fontSize: 11.5, color: C.inkFaint }}>
                You're all caught up
              </Text>
            </View>
          ) : (
            <View className="h-4" />
          )
        }
      />
    </View>
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
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14, paddingBottom: 14 }}>
      <View className="flex-row items-center" style={{ gap: 11 }}>
        <View
          className="items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: C.violetTintWarm }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: C.violetInk }}>
            {(user?.name?.[0] || 'A').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 17, color: C.ink }} numberOfLines={1}>
            Hello, {firstName}
          </Text>
          <Text className="font-sans" style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 2 }} numberOfLines={1}>
            {subline}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          className="items-center justify-center shadow-sm"
          onPress={() => setSettingsVisible(true)}
          style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: '#FFFFFF' }}
        >
          <Feather name="settings" size={18} color={C.ink} />
          {atRiskCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 9,
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: C.violet,
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            />
          )}
        </TouchableOpacity>
      </View>

      <CustomerSettingsSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)} />

      <View style={{ backgroundColor: C.violet, borderRadius: 30, padding: 20, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -46,
            width: 150,
            height: 150,
            borderRadius: 999,
            backgroundColor: C.violetLight,
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 26,
            bottom: -56,
            width: 110,
            height: 110,
            borderRadius: 999,
            backgroundColor: C.violetDeep,
          }}
        />
        <Text
          className="font-sans-semibold"
          style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.violetTintWarm }}
        >
          {atRiskCount > 0 ? 'Triage first' : 'Desk status'}
        </Text>
        <View className="flex-row items-end" style={{ gap: 8, marginTop: 6, marginBottom: 4 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 44, lineHeight: 46, color: '#FFFFFF' }}>
            {atRiskCount}
          </Text>
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: C.violetTintWarm, paddingBottom: 7 }}>
            ticket{atRiskCount === 1 ? '' : 's'} escalated
          </Text>
        </View>
        <Text
          className="font-sans"
          style={{ fontSize: 13, lineHeight: 19, color: C.violetTintWarm, maxWidth: 220, marginBottom: 16 }}
        >
          {atRiskCount === 0
            ? 'Nothing escalated right now. You are ahead of the desk.'
            : `${atRiskCount} escalated ticket${atRiskCount > 1 ? 's' : ''} needing a response right now.`}
        </Text>

        <View className="flex-row items-center" style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={onStartTriage}
            activeOpacity={0.85}
            className="flex-row items-center"
            style={{ backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 18, minHeight: 44, gap: 8 }}
          >
            <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.bg }}>
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
                    className="items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      marginLeft: i > 0 ? -8 : 0,
                      borderWidth: 2,
                      borderColor: C.violet,
                      backgroundColor: AVATAR_BG[idx],
                    }}
                  >
                    <Text className="font-sans-semibold" style={{ fontSize: 10, color: AVATAR_INK[idx] }}>
                      {initialsOf(name)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View className="flex-row" style={{ gap: 11 }}>
        <View style={{ flex: 1, backgroundColor: C.mint, borderRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 32, lineHeight: 34, color: C.mintInk }}>
            {needsWorkCount}
          </Text>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.mintInk2, marginTop: 5 }}
          >
            Need work
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: C.marigold, borderRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 }}>
          <Text className="font-sans-semibold" style={{ fontSize: 32, lineHeight: 34, color: C.marigoldInk }}>
            {doneCount}
          </Text>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: C.marigoldInk2, marginTop: 5 }}
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
    <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
      <TicketSearchFilterBar
        searchValue={searchInput}
        onChangeSearch={setSearchInput}
        selectedStatuses={statusFilter}
        onChangeStatuses={setStatusFilter}
        statusOptions={DEFAULT_STATUS_OPTIONS}
        placeholder="Search ticket no., subject, assignee..."
      />

      <View className="flex-row" style={{ backgroundColor: C.ink, borderRadius: 999, padding: 5, gap: 3 }}>
        {SEGMENTS.map((segment) => {
          const isActive = activeSegment === segment.id;
          return (
            <TouchableOpacity
              key={segment.id}
              onPress={() => setActiveSegment(segment.id)}
              activeOpacity={0.85}
              className="flex-1 flex-row items-center justify-center"
              style={{
                borderRadius: 999,
                paddingVertical: 10,
                backgroundColor: isActive ? '#FDF8EE' : 'transparent',
              }}
            >
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 13, color: isActive ? C.ink : '#C0B6A5' }}
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
      style={{
        backgroundColor: C.mint,
        borderRadius: 26,
        marginHorizontal: 16,
        paddingVertical: 34,
        paddingHorizontal: 24,
        alignItems: 'center',
      }}
    >
      <View
        className="items-center justify-center"
        style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: C.bg, marginBottom: 14 }}
      >
        <Feather name="coffee" size={22} color={C.mintInk2} />
      </View>
      <Text className="font-sans-semibold" style={{ fontSize: 19, color: C.mintInk, marginBottom: 4 }}>
        All clear
      </Text>
      <Text className="font-sans" style={{ fontSize: 13, color: C.mintInk2, textAlign: 'center' }}>
        {hasFilter ? `Nothing matches the selected filter in ${label}.` : `Nothing in ${label} right now.`}
      </Text>
    </View>
  );
}