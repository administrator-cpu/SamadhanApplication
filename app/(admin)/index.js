// app/(admin)/index.js
import React, { useMemo } from 'react';
import { View, Text, RefreshControl, Pressable, StyleSheet } from 'react-native';
import Screen from '../../src/components/layout/Screen';
import { DENSE_FONT_SCALE } from '../../src/components/layout/tokens';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStats } from '../../src/hooks/useAdminStats';
import LoadingState from '../../src/components/ui/LoadingState';
import ErrorState from '../../src/components/ui/ErrorState';
import InitializingScreen from '../../src/components/InitializingScreen.js';
const BAR_FILLS = ['bg-[#B6A9FF]', 'bg-[#6C5CE7]', 'bg-[#4A34C7]', 'bg-[#3A2F7A]'];
// Bar height is a share of the busiest category — data-driven.
const barHeight = (pct) => ({ height: `${Math.max(pct * 100, 4)}%` });

const C = {
  ground: '#F3F2FD',
  ink: '#151233',
  inkSoft: '#2B2359',
  card: '#FFFFFF',
  hair: '#F0EEFB',
  text: '#151233',
  muted: '#6D6A96',
  faint: '#9D9AC0',
  violet: '#4A34C7',
  violetTint: '#EBE8FF',
  violetLift: '#B6A9FF',
  violetMid: '#6C5CE7',
  violetDeep: '#3A2F7A',
  green: '#0F7A56',
  greenInk: '#0B3B2C',
  greenTint: '#CCF7E4',
  greenWash: '#F6FDF9',
  red: '#B3261E',
  redDot: '#E5534B',
  redTint: '#FFE1E1',
};

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAdminStats();

  const categories = stats?.categories || [];
  const summary = stats?.summary || {};
  const agents = stats?.agents || [];

  // Top four named categories + a single "Everything else" remainder, so the
  // long tail is shown instead of silently dropped.
  const bars = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => (Number(b.count) || 0) - (Number(a.count) || 0)
    );
    const top = sorted.slice(0, 4).map((c) => ({
      label: c.name || '—',
      count: Number(c.count) || 0,
    }));
    const rest = sorted.slice(4).reduce((sum, c) => sum + (Number(c.count) || 0), 0);
    const list = rest > 0 ? [...top, { label: 'Everything else', count: rest, rest: true }] : top;
    const max = Math.max(...list.map((b) => b.count), 1);
    return list.map((b) => ({ ...b, pct: b.count / max }));
  }, [categories]);

  // Ranked by lifetime handled — total_assigned is a record, not a capacity.
  const roster = useMemo(
    () =>
      [...agents].sort(
        (a, b) => (Number(b.total_assigned) || 0) - (Number(a.total_assigned) || 0)
      ),
    [agents]
  );

  if (isLoading) return <LoadingState label="Loading Dashboard..." />;

  if (isError) {
    return (
      <ErrorState
        title="Oops! Something went wrong."
        message={error?.message || 'Failed to load dashboard stats.'}
        onRetry={refetch}
      />
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';
  const userInitials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const active = Number(summary.active_tickets) || 0;
  const escalated = Number(summary.escalated_tickets) || 0;
  const total = Number(summary.total_tickets) || 0;
  const topCategory = bars[0];
  const topShare = total > 0 && topCategory ? Math.round((topCategory.count / total) * 100) : 0;

  const headline =
    active === 0
      ? 'Nothing open right now.'
      : active === 1
      ? 'One ticket is open.'
      : `${active} tickets are open.`;

  const subline =
    escalated > 0
      ? `${escalated} escalated — those need you first.`
      : 'Nothing escalated.';

  return (
    <Screen
      scroll
      className="bg-[#F3F2FD]"
      contentContainerClassName="p-[12px] std:p-[16px] pt-[12px]"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violet} />
      }
    >
      {/* HEADER */}
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-[12px]">
          <Text
            className="font-sans-semibold text-[10.5px] tracking-[1.3px] uppercase text-[#4A34C7]"
          >
            Admin
          </Text>
          <Text
            className="font-sans-semibold text-[28px] leading-[32px] tracking-[-0.7px] text-[#151233] mt-[4px]"
          >
            Hi, {firstName}
          </Text>
          <Text className="font-sans-medium text-[12.5px] text-[#6D6A96] mt-[7px]">
            {headline} {subline}
          </Text>
        </View>
        <View
          className="w-[38px] h-[38px] rounded-[999px] bg-[#EBE8FF] items-center justify-center"
        >
          <Text className="font-sans-semibold text-[13px] text-[#4A34C7]">
            {userInitials}
          </Text>
        </View>
      </View>

      {/* LIVE STATE HERO */}
      <View
        className="bg-[#FFFFFF] rounded-[26px] p-[20px] mt-[18px]" style={sx.shadow1}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className={`w-[7px] h-[7px] rounded-[999px] mr-[7px] ${active > 0 ? 'bg-[#E5534B]' : 'bg-[#0F7A56]'}`}
            />
            <Text
              className={`font-sans-semibold text-[9.5px] tracking-[1.1px] uppercase ${active > 0 ? 'text-[#B3261E]' : 'text-[#0F7A56]'}`}
            >
              {active > 0 ? 'Open now' : 'All clear'}
            </Text>
          </View>
          <Text className="font-sans-medium text-[11px] text-[#9D9AC0]">
            {total} all time
          </Text>
        </View>

        <View className="flex-row items-end mt-[14px]">
          <Text
            className="font-sans-semibold text-[56px] leading-[56px] tracking-[-2.5px] text-[#151233]"
          >
            {active}
          </Text>
          <Text
            className="font-sans-medium text-[12.5px] leading-[17px] text-[#6D6A96] pb-[8px] ml-[12px] flex-1"
          >
            active {active === 1 ? 'ticket' : 'tickets'}
            {'\n'}
            {escalated > 0 ? `${escalated} escalated` : 'none escalated'}
          </Text>
        </View>

        {topCategory ? (
          <View
            className="flex-row items-center mt-[18px] pt-[16px] border-t border-t-[#F0EEFB]"
          >
            <View
              className="px-[10px] py-[5px] rounded-[999px] bg-[#FFE1E1] mr-[9px]"
            >
              <Text
                className="font-sans-semibold text-[9.5px] tracking-[0.7px] uppercase text-[#B3261E]"
              >
                {topCategory.label}
              </Text>
            </View>
            <Text className="font-sans-medium flex-1 text-[12px] text-[#6D6A96]">
              Biggest fault · {topShare}% of everything raised
            </Text>
          </View>
        ) : null}
      </View>

      {/* STAT ROW */}
      <View className="flex-row gap-[10px] mt-[18px]">
        <StatTile
          value={summary.resolved_today ?? 0}
          label="Closed today"
          tone="mint"
        />
        <StatTile value={summary.tickets_last_24h ?? 0} label="In 24 hours" />
        <StatTile
          value={`${summary.active_agents ?? 0}`}
          suffix={`/${summary.total_agents ?? 0}`}
          label="On shift"
        />
      </View>

      {/* FAULT MIX */}
      <View className="bg-[#151233] rounded-[24px] p-[18px] mt-[18px]">
        <View
          className="flex-row items-baseline justify-between mb-[18px]"
        >
          <Text className="font-sans-semibold text-[15px] tracking-[-0.2px] text-[#F3F2FD]">
            Fault mix
          </Text>
          <Text className="font-sans-medium text-[11px] text-[#8B86C4]">
            {total} all time
          </Text>
        </View>

        <View className="flex-row items-end gap-[9px] h-[120px]">
          {bars.map((bar, i) => (
            <View key={bar.label} className="flex-1 items-center">
              <Text
                className={`font-sans-semibold text-[12px] mb-[8px] ${i === 0 ? 'text-[#B6A9FF]' : 'text-[#8B86C4]'}`}
              >
                {bar.count}
              </Text>
              <View
                className={`w-full rounded-tl-[10px] rounded-tr-[10px] rounded-bl-[4px] rounded-br-[4px] ${bar.rest ? 'bg-[#2B2359]' : BAR_FILLS[i] || 'bg-[#2B2359]'}`}
                style={barHeight(bar.pct)}
              />
            </View>
          ))}
        </View>

        <View className="flex-row gap-[9px] mt-[10px]">
          {bars.map((bar) => (
            <Text
              key={`l-${bar.label}`}
              numberOfLines={2}
              className="font-sans-semibold flex-1 text-center text-[9.5px] leading-[12px] text-[#8B86C4]"
            >
              {bar.label}
            </Text>
          ))}
        </View>

        {topCategory ? (
          <View
            className="flex-row items-center justify-between mt-[16px] pt-[14px] border-t border-t-[#2B2359]"
          >
            <Text className="font-sans-medium flex-1 text-[11.5px] text-[#B6B1E0]">
              {topCategory.label} is {topShare}% of everything raised
            </Text>
            <Feather name="chevron-right" size={14} color={C.violetLift} />
          </View>
        ) : null}
      </View>

      {/* ROSTER */}
      <View
        className="bg-[#FFFFFF] rounded-[24px] px-[18px] pt-[18px] pb-[6px] mt-[18px]" style={sx.shadow1}
      >
        <View className="flex-row items-baseline justify-between">
          <Text className="font-sans-semibold text-[15px] tracking-[-0.2px] text-[#151233]">
            Roster
          </Text>
          <Text className="font-sans-semibold text-[11px] text-[#4A34C7]">
            Manage
          </Text>
        </View>
        <Text className="font-sans-medium text-[11px] text-[#9D9AC0] mt-[3px]">
          Tickets handled, all time
        </Text>

        {roster.map((agent, index) => {
          const activeAssigned = Number(agent.active_assigned) || 0;
          const handled = Number(agent.total_assigned) || 0;
          const onShift = activeAssigned > 0;
          const isLast = index === roster.length - 1;
          const role = (agent.role || '').replace(/_/g, ' ').toLowerCase();

          return (
            <View
              key={agent.employee_id || index}
              className={`flex-row items-center py-[13px] border-b-[#F0EEFB] ${onShift ? 'px-[14px] mx-[-14px] rounded-[14px] bg-[#F6FDF9]' : 'px-0 mx-0 rounded-none bg-transparent'} ${isLast ? 'border-b-0' : 'border-b'}`}
            >
              <Text
                className="font-sans-semibold w-[15px] text-[11px] text-[#9D9AC0]"
              >
                {index + 1}
              </Text>
              <View className="flex-1 min-w-0 ml-[8px]">
                <View className="flex-row items-center">
                  <Text
                    numberOfLines={1}
                    className="font-sans-semibold text-[13px] text-[#151233] shrink"
                  >
                    {(agent.name || '').trim()}
                  </Text>
                  {onShift ? (
                    <View
                      className="w-[6px] h-[6px] rounded-[999px] bg-[#0F7A56] ml-[7px]"
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  className={`font-sans-medium text-[10.5px] mt-[1px] capitalize ${onShift ? 'text-[#0F7A56]' : 'text-[#6D6A96]'}`}
                >
                  {onShift
                    ? `On shift · holding ${activeAssigned} ${activeAssigned === 1 ? 'ticket' : 'tickets'}`
                    : `${role || 'Support agent'} · off shift`}
                </Text>
              </View>
              <Text
                className="font-sans-semibold text-[15px] tracking-[-0.3px] text-[#151233]"
              >
                {handled}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
    // <InitializingScreen/>
  );
}

const STAT_TONES = {
  card: { bg: 'bg-[#FFFFFF]', value: 'text-[#151233]', label: 'text-[#6D6A96]', lifted: true },
  mint: { bg: 'bg-[#CCF7E4]', value: 'text-[#0B3B2C]', label: 'text-[#0F7A56]', lifted: false },
};

function StatTile({ value, suffix, label, tone = 'card' }) {
  const t = STAT_TONES[tone];
  return (
    <View className={`flex-1 rounded-[22px] p-[12px] std:p-[16px] ${t.bg}`} style={t.lifted ? sx.shadow1 : undefined}>
      <Text
        maxFontSizeMultiplier={DENSE_FONT_SCALE}
        className={`font-sans-semibold text-[27px] tracking-[-1.1px] ${t.value}`}
      >
        {value}
        {suffix ? (
          <Text className="font-sans-semibold text-[16px] text-[#9D9AC0]">
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text maxFontSizeMultiplier={DENSE_FONT_SCALE} className={`font-sans-semibold text-[10.5px] mt-[4px] ${t.label}`}>
        {label}
      </Text>
    </View>
  );
}

const sx = StyleSheet.create({
  shadow1: { shadowColor: '#1A1440', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
});
