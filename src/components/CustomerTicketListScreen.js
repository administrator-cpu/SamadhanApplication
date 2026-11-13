// src/components/CustomerTicketListScreen.js (or app/(customer)/index.js)
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import Screen, { BottomInset, ScreenScrollView } from './layout/Screen';

// Floating raise button (56) + gap above it.
const RAISE_BAR_SPACE = 56 + 12 + 24;

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
    <Screen className="bg-[#F3F2FD]">
      <ScreenScrollView
        endSpace={RAISE_BAR_SPACE}
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
        <View className="px-[12px] std:px-[16px] pt-[16px] gap-[14px]">
          <View className="flex-row items-center gap-[11px]">
            <TouchableOpacity
              onPress={handleGoToProfile}
              activeOpacity={0.85}
              className="items-center justify-center w-[44px] h-[44px] rounded-[999px] bg-[#CCF7E4]"
            >
              <Feather name="user" size={19} color={C.mintInk2} />
            </TouchableOpacity>
            <View className="flex-1 min-w-0">
              <Text className="font-sans-semibold text-[17px] text-[#151233]" numberOfLines={1}>
                Hello, {user?.name || 'there'}
              </Text>
              <Text className="font-sans text-[11.5px] mt-[2px] text-[#6D6A96]" numberOfLines={1}>
                {filteredTickets.length} total · {segmentCounts.RESOLVED} resolved
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              activeOpacity={0.85}
              className="items-center justify-center shadow-sm w-[40px] h-[40px] rounded-[999px] bg-[#FFFFFF]"
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
            <View className="rounded-[30px] p-[20px] overflow-hidden bg-[#CCF7E4]">
              <View
                className="absolute right-[-30px] bottom-[-50px] w-[140px] h-[140px] rounded-[999px] bg-[rgba(15,122,86,0.12)]"
              />
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-[12px]">
                  <Text
                    className="font-sans-semibold text-[10px] tracking-[1.2px] uppercase text-[#0F7A56]"
                  >
                    Latest Request
                  </Text>
                  <Text
                    className="font-sans-semibold text-[26px] mt-[4px] text-[#0D6B4B]"
                    numberOfLines={1}
                  >
                    {latestTicket.subject?.trim() || 'Support Request'}
                  </Text>
                  <Text className="font-sans text-[13px] mt-[6px] text-[#0F7A56]">
                    {statusSummaryLabel(latestTicket)}
                  </Text>
                </View>
                <ProgressRing percent={progressOf(latestTicket)} />
              </View>

              <TouchableOpacity
                onPress={() => handleTicketPress(latestTicket.id)}
                activeOpacity={0.85}
                className="flex-row items-center self-start rounded-[999px] px-[18px] min-h-[44px] gap-[8px] mt-[18px] bg-[#151233]"
              >
                <Text className="font-sans-semibold text-[13px] text-[#F3F2FD]">
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
          <View className="flex-row rounded-[999px] p-[5px] gap-[3px] bg-[#151233]">
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
                  className={`flex-row items-center justify-center flex-1 rounded-[999px] py-[10px] gap-[5px] ${isActive ? 'bg-[#FDF8EE]' : 'bg-transparent'}`}
                >
                  <Text
                    className={`font-sans-semibold text-[12.5px] ${isActive ? 'text-[#151233]' : 'text-[#C0B6A5]'}`}
                    numberOfLines={1}
                  >
                    {segment.label}
                  </Text>
                 
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="font-sans text-[11px] text-[#9D9AC0]">
            {segmentLabel} · {activeTickets.length} ticket{activeTickets.length === 1 ? '' : 's'}
            {statusFilter.length > 0 ? ' · filtered' : ''}
          </Text>
        </View>

        {/* Ticket list */}
        <View className="pt-[14px]">
          {showSkeleton ? (
            <View className="px-[12px] std:px-[16px]">
              <SkeletonList count={4} />
            </View>
          ) : isError ? (
            <ErrorState
              title="Unable to load your requests"
              message={error?.message || 'Please check your connection and try again.'}
              onRetry={refetch}
            />
          ) : activeTickets.length === 0 ? (
            <View className="px-[12px] std:px-[16px]">
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
                <Text className="font-sans-semibold text-[13px] text-[#6C5CE7]">
                  Load more
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScreenScrollView>

      <BottomInset extra={12} className="absolute bottom-0 left-[16px] right-[16px]">
        <TouchableOpacity
          onPress={handleRaiseTicket}
          activeOpacity={0.9}
          className="flex-row items-center justify-center shadow-sm rounded-[999px] h-[56px] gap-[8px] bg-[#6C5CE7]"
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text className="font-sans-semibold text-[15px] text-[#FFFFFF]">
            Raise a new request
          </Text>
        </TouchableOpacity>
      </BottomInset>
    </Screen>
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
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
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
      <Text className="absolute font-sans-semibold text-[13px] text-[#0D6B4B]" maxFontSizeMultiplier={1.2}>
        {percent}%
      </Text>
    </View>
  );
}

