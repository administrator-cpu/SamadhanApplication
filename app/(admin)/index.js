// app/(admin)/index.js
import React, { useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useAdminStats } from '../../src/hooks/useAdminStats';
import LoadingState from '../../src/components/ui/LoadingState';
import ErrorState from '../../src/components/ui/ErrorState';
import InitializingScreen from '../../src/components/InitializingScreen.js';
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
    <ScrollView
      style={{ flex: 1, backgroundColor: C.ground }}
      contentContainerStyle={{ padding: 16, paddingTop: 36, paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violet} />
      }
    >
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 10.5, letterSpacing: 1.3, textTransform: 'uppercase', color: C.violet }}
          >
            Admin
          </Text>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: C.text, marginTop: 4 }}
          >
            Hi, {firstName}
          </Text>
          <Text className="font-sans-medium" style={{ fontSize: 12.5, color: C.muted, marginTop: 7 }}>
            {headline} {subline}
          </Text>
        </View>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: C.violetTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 13, color: C.violet }}>
            {userInitials}
          </Text>
        </View>
      </View>

      {/* LIVE STATE HERO */}
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 26,
          padding: 20,
          marginTop: 18,
          shadowColor: '#1A1440',
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                marginRight: 7,
                backgroundColor: active > 0 ? C.redDot : C.green,
              }}
            />
            <Text
              className="font-sans-semibold"
              style={{ fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase', color: active > 0 ? C.red : C.green }}
            >
              {active > 0 ? 'Open now' : 'All clear'}
            </Text>
          </View>
          <Text className="font-sans-medium" style={{ fontSize: 11, color: C.faint }}>
            {total} all time
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 }}>
          <Text
            className="font-sans-semibold"
            style={{ fontSize: 56, lineHeight: 56, letterSpacing: -2.5, color: C.text }}
          >
            {active}
          </Text>
          <Text
            className="font-sans-medium"
            style={{ fontSize: 12.5, lineHeight: 17, color: C.muted, paddingBottom: 8, marginLeft: 12, flex: 1 }}
          >
            active {active === 1 ? 'ticket' : 'tickets'}
            {'\n'}
            {escalated > 0 ? `${escalated} escalated` : 'none escalated'}
          </Text>
        </View>

        {topCategory ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: C.hair,
            }}
          >
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: C.redTint,
                marginRight: 9,
              }}
            >
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 9.5, letterSpacing: 0.7, textTransform: 'uppercase', color: C.red }}
              >
                {topCategory.label}
              </Text>
            </View>
            <Text className="font-sans-medium" style={{ flex: 1, fontSize: 12, color: C.muted }}>
              Biggest fault · {topShare}% of everything raised
            </Text>
          </View>
        ) : null}
      </View>

      {/* STAT ROW */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <StatTile
          value={summary.resolved_today ?? 0}
          label="Closed today"
          bg={C.greenTint}
          valueColor={C.greenInk}
          labelColor={C.green}
        />
        <StatTile value={summary.tickets_last_24h ?? 0} label="In 24 hours" />
        <StatTile
          value={`${summary.active_agents ?? 0}`}
          suffix={`/${summary.total_agents ?? 0}`}
          label="On shift"
        />
      </View>

      {/* FAULT MIX */}
      <View style={{ backgroundColor: C.ink, borderRadius: 24, padding: 18, marginTop: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <Text className="font-sans-semibold" style={{ fontSize: 15, letterSpacing: -0.2, color: C.ground }}>
            Fault mix
          </Text>
          <Text className="font-sans-medium" style={{ fontSize: 11, color: '#8B86C4' }}>
            {total} all time
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 120 }}>
          {bars.map((bar, i) => (
            <View key={bar.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 12, color: i === 0 ? C.violetLift : '#8B86C4', marginBottom: 8 }}
              >
                {bar.count}
              </Text>
              <View
                style={{
                  width: '100%',
                  height: `${Math.max(bar.pct * 100, 4)}%`,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                  backgroundColor: bar.rest
                    ? C.inkSoft
                    : [C.violetLift, C.violetMid, C.violet, C.violetDeep][i] || C.inkSoft,
                }}
              />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
          {bars.map((bar) => (
            <Text
              key={`l-${bar.label}`}
              numberOfLines={2}
              className="font-sans-semibold"
              style={{ flex: 1, textAlign: 'center', fontSize: 9.5, lineHeight: 12, color: '#8B86C4' }}
            >
              {bar.label}
            </Text>
          ))}
        </View>

        {topCategory ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 16,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: C.inkSoft,
            }}
          >
            <Text className="font-sans-medium" style={{ flex: 1, fontSize: 11.5, color: '#B6B1E0' }}>
              {topCategory.label} is {topShare}% of everything raised
            </Text>
            <Feather name="chevron-right" size={14} color={C.violetLift} />
          </View>
        ) : null}
      </View>

      {/* ROSTER */}
      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 24,
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 6,
          marginTop: 18,
          shadowColor: '#1A1440',
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text className="font-sans-semibold" style={{ fontSize: 15, letterSpacing: -0.2, color: C.text }}>
            Roster
          </Text>
          <Text className="font-sans-semibold" style={{ fontSize: 11, color: C.violet }}>
            Manage
          </Text>
        </View>
        <Text className="font-sans-medium" style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 13,
                paddingHorizontal: onShift ? 14 : 0,
                marginHorizontal: onShift ? -14 : 0,
                borderRadius: onShift ? 14 : 0,
                backgroundColor: onShift ? C.greenWash : 'transparent',
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: C.hair,
              }}
            >
              <Text
                className="font-sans-semibold"
                style={{ width: 15, fontSize: 11, color: C.faint }}
              >
                {index + 1}
              </Text>
              <View style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    numberOfLines={1}
                    className="font-sans-semibold"
                    style={{ fontSize: 13, color: C.text, flexShrink: 1 }}
                  >
                    {(agent.name || '').trim()}
                  </Text>
                  {onShift ? (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: C.green,
                        marginLeft: 7,
                      }}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  className="font-sans-medium"
                  style={{
                    fontSize: 10.5,
                    marginTop: 1,
                    color: onShift ? C.green : C.muted,
                    textTransform: 'capitalize',
                  }}
                >
                  {onShift
                    ? `On shift · holding ${activeAssigned} ${activeAssigned === 1 ? 'ticket' : 'tickets'}`
                    : `${role || 'Support agent'} · off shift`}
                </Text>
              </View>
              <Text
                className="font-sans-semibold"
                style={{ fontSize: 15, letterSpacing: -0.3, color: C.text }}
              >
                {handled}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
    // <InitializingScreen/>
  );
}

function StatTile({ value, suffix, label, bg = C.card, valueColor = C.text, labelColor = C.muted }) {
  const lifted = bg === C.card;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 22,
        padding: 16,
        shadowColor: '#1A1440',
        shadowOpacity: lifted ? 0.06 : 0,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: lifted ? 2 : 0,
      }}
    >
      <Text
        className="font-sans-semibold"
        style={{ fontSize: 27, letterSpacing: -1.1, color: valueColor }}
      >
        {value}
        {suffix ? (
          <Text className="font-sans-semibold" style={{ fontSize: 16, color: C.faint }}>
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text className="font-sans-semibold" style={{ fontSize: 10.5, color: labelColor, marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}
