// src/components/CustomerTicketListScreen.js (or app/(customer)/index.js)
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import EmptyState from './ui/EmptyState';
import ErrorState from './ui/ErrorState';
import { SkeletonList } from './ui/SkeletonCard';

import { useTickets } from '../hooks/useTickets';
import { haptics } from '../utils/haptics';
import { useAuthStore } from '../store/authStore';
import TicketCard, { C } from './TicketCard';
import CustomerSettingsSheet from './CustomerSettingsSheet';
import TicketSearchFilterBar from './TicketSearchFilterBar';

const SEGMENTS = [
  { id: 'NEEDS_YOU', label: 'Needs you' },
  { id: 'ON_IT', label: 'We are on it' },
  { id: 'RESOLVED', label: 'Resolved' },
];

function segmentOf(ticket) {
  const s = String(ticket?.status || '').toUpperCase();
  if (s.includes('RESOLV') || s.includes('CLOS')) return 'RESOLVED';
  if (s.includes('PROGRESS') || s.includes('ESCALAT') || s.includes('WORK')) return 'ON_IT';
  return 'NEEDS_YOU';
}

function progressOf(ticket) {
  const seg = segmentOf(ticket);
  if (seg === 'RESOLVED') return 100;
  if (seg === 'ON_IT') return 55;
  return 25;
}

// Real-field-only summary, replacing the old SLA-based fixExpectedLabel.
function statusSummaryLabel(ticket) {
  const seg = segmentOf(ticket);
  if (seg === 'RESOLVED') return 'Marked resolved';
  if (seg === 'ON_IT') {
    return ticket?.assigned_employee_name?.trim()
      ? `Being handled by ${ticket.assigned_employee_name.trim()}`
      : 'Being worked on';
  }
  return ticket?.assigned_employee_name?.trim() ? 'Awaiting update' : 'Waiting for assignment';
}

/* ---------------------------------------------------------------- */
/* Main screen                                                       */
/* ---------------------------------------------------------------- */

export default function CustomerDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const basePath = '/(customer)/tickets';

  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('ON_IT');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
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
    ownership: 'mine',
  });

  const allTickets = useMemo(() => data?.pages.flatMap((p) => p.tickets) ?? [], [data?.pages]);

function matchesSearch(ticket, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const searchableFields = [
    ticket?.ticket_no,
    ticket?.subject,
    ticket?.status,
    ticket?.assigned_employee_name,
    ticket?.circuit_description,
    ticket?.customer_name,
  ];

  return searchableFields.some((field) =>
    String(field || '').toLowerCase().includes(q)
  );
}
  const filteredTickets = useMemo(() => {
     let result = allTickets;
    if (statusFilter.length > 0) {
      result = result.filter((t) => statusFilter.includes(t.status));
    }
    if (debouncedQuery.trim()) {
      result = result.filter((t) => matchesSearch(t, debouncedQuery));
    }
    return result;
  }, [allTickets, statusFilter, debouncedQuery]);

  const buckets = useMemo(() => {
    const result = { NEEDS_YOU: [], ON_IT: [], RESOLVED: [] };
    filteredTickets.forEach((t) => {
      result[segmentOf(t)].push(t);
    });
    return result;
  }, [filteredTickets]);

  const segmentCounts = {
    NEEDS_YOU: buckets.NEEDS_YOU.length,
    ON_IT: buckets.ON_IT.length,
    RESOLVED: buckets.RESOLVED.length,
  };

  const activeTickets = buckets[activeSegment];

  const latestTicket = useMemo(() => {
    const inFlight = [...buckets.NEEDS_YOU, ...buckets.ON_IT];
    const pool = inFlight.length > 0 ? inFlight : filteredTickets;
    if (pool.length === 0) return null;
    return [...pool].sort(
      (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
    )[0];
  }, [buckets, filteredTickets]);

  const handleTicketPress = useCallback((id) => router.push(`${basePath}/${id}`), [basePath, router]);
  const handleRaiseTicket = useCallback(() => router.push('/(customer)/raise-ticket'), [router]);
  const handleGoToProfile = useCallback(() => router.push('/(customer)/profile'), [router]);

  const showSkeleton = isLoading && !data;
  const segmentLabel = SEGMENTS.find((s) => s.id === activeSegment)?.label ?? 'Needs you';

  return (
    <View className="flex-1 mt-[35px]" style={{ backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
          <View className="flex-row items-center" style={{ gap: 11 }}>
            <TouchableOpacity
              onPress={handleGoToProfile}
              activeOpacity={0.85}
              className="items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: C.mint }}
            >
              <Feather name="user" size={19} color={C.mintInk2} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text className="font-sans-semibold" style={{ fontSize: 17, color: C.ink }} numberOfLines={1}>
                Hello, {user?.name || 'there'}
              </Text>
              <Text className="font-sans" style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 2 }} numberOfLines={1}>
                {filteredTickets.length} total · {segmentCounts.RESOLVED} resolved
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              activeOpacity={0.85}
              className="items-center justify-center shadow-sm"
              style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: '#FFFFFF' }}
            >
              <Feather name="settings" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>
          <CustomerSettingsSheet
            visible={settingsVisible}
            onClose={() => setSettingsVisible(false)}
          />

          {/* Latest Request hero */}
          {latestTicket && (
            <View style={{ backgroundColor: C.mint, borderRadius: 30, padding: 20, overflow: 'hidden' }}>
              <View
                style={{
                  position: 'absolute',
                  right: -30,
                  bottom: -50,
                  width: 140,
                  height: 140,
                  borderRadius: 999,
                  backgroundColor: 'rgba(15,122,86,0.12)',
                }}
              />
              <View className="flex-row items-start justify-between">
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    className="font-sans-semibold"
                    style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.mintInk2 }}
                  >
                    Latest Request
                  </Text>
                  <Text
                    className="font-sans-semibold"
                    style={{ fontSize: 26, color: C.mintInk, marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {latestTicket.subject?.trim() || 'Support Request'}
                  </Text>
                  <Text className="font-sans" style={{ fontSize: 13, color: C.mintInk2, marginTop: 6 }}>
                    {statusSummaryLabel(latestTicket)}
                  </Text>
                </View>
                <ProgressRing percent={progressOf(latestTicket)} />
              </View>

              <TouchableOpacity
                onPress={() => handleTicketPress(latestTicket.id)}
                activeOpacity={0.85}
                className="flex-row items-center self-start"
                style={{ backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 18, minHeight: 44, gap: 8, marginTop: 18 }}
              >
                <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.bg }}>
                  Track it
                </Text>
                <Feather name="arrow-right" size={15} color={C.bg} />
              </TouchableOpacity>
            </View>
          )}

          {/* Search + status filter menu */}
          <TicketSearchFilterBar
            searchValue={searchInput}
            onChangeSearch={setSearchInput}
            selectedStatuses={statusFilter}
            onChangeStatuses={setStatusFilter}
          />

          {/* Segmented tabs — counts now reflect the active status filter too */}
          <View className="flex-row" style={{ backgroundColor: C.ink, borderRadius: 999, padding: 5, gap: 3 }}>
            {SEGMENTS.map((segment) => {
              const isActive = activeSegment === segment.id;
              const count = segmentCounts[segment.id] ?? 0;
              return (
                <TouchableOpacity
                  key={segment.id}
                  onPress={() => {
                    haptics.light();
                    setActiveSegment(segment.id);
                  }}
                  activeOpacity={0.85}
                  className="flex-row items-center justify-center"
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    paddingVertical: 10,
                    gap: 5,
                    backgroundColor: isActive ? '#FDF8EE' : 'transparent',
                  }}
                >
                  <Text
                    className="font-sans-semibold"
                    style={{ fontSize: 12.5, color: isActive ? C.ink : '#C0B6A5' }}
                    numberOfLines={1}
                  >
                    {segment.label}
                  </Text>
                 
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="font-sans" style={{ fontSize: 11, color: C.inkFaint }}>
            {segmentLabel} · {activeTickets.length} ticket{activeTickets.length === 1 ? '' : 's'}
            {statusFilter.length > 0 ? ' · filtered' : ''}
          </Text>
        </View>

        {/* Ticket list */}
        <View style={{ paddingTop: 14 }}>
          {showSkeleton ? (
            <View style={{ paddingHorizontal: 16 }}>
              <SkeletonList count={4} />
            </View>
          ) : isError ? (
            <ErrorState
              title="Unable to load your requests"
              message={error?.message || 'Please check your connection and try again.'}
              onRetry={refetch}
            />
          ) : activeTickets.length === 0 ? (
            <View style={{ paddingHorizontal: 16 }}>
              <EmptyState
                icon="coffee"
                title="All clear"
                subtitle={
                  debouncedQuery
                    ? `Nothing matched "${debouncedQuery}".`
                    : statusFilter.length > 0
                      ? `Nothing matches the selected filter in ${segmentLabel.toLowerCase()}.`
                      : `Nothing in ${segmentLabel.toLowerCase()} right now.`
                }
              />
            </View>
          ) : (
            activeTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                role={user?.role}
                onPress={() => handleTicketPress(ticket.id)}
              />
            ))
          )}

          {hasNextPage && !showSkeleton && !isError && (
            <TouchableOpacity
              onPress={fetchNextPage}
              disabled={isFetchingNextPage}
              className="items-center py-4"
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color={C.violet} />
              ) : (
                <Text className="font-sans-semibold" style={{ color: C.violet, fontSize: 13 }}>
                  Load more
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={handleRaiseTicket}
          activeOpacity={0.9}
          className="flex-row items-center justify-center shadow-sm"
          style={{ backgroundColor: C.violet, borderRadius: 999, height: 56, gap: 8 }}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text className="font-sans-semibold" style={{ fontSize: 15, color: '#FFFFFF' }}>
            Raise a new request
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- */
/* Circular progress ring                                             */
/* ---------------------------------------------------------------- */

function ProgressRing({ percent = 0, size = 64, stroke = 6 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(15,122,86,0.15)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={C.mintSpine}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.mintInk }}>
        {percent}%
      </Text>
    </View>
  );
}