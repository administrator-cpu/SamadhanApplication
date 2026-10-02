// app/(agent)/index.js
import { useMemo } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useAgentStats } from '../../src/hooks/useAgentStats';
import TicketCard, { C } from '../../src/components/TicketCard';
import LoadingState from '../../src/components/ui/LoadingState';
import ErrorState from '../../src/components/ui/ErrorState';
import { pickStat } from '../../src/utils/statSummary';

const onDark = '#B7B2E8';
const onCoral = '#FFD9C4';

const STATE_META = {
  OPEN: { label: 'New', tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  IN_PROGRESS: { label: 'In progress', tint: C.violetTint, ink: C.violetInk, spine: C.violet },
  ESCALATED: { label: 'Escalated', tint: C.coral, ink: '#FFFFFF', spine: C.coralSpine },
  REOPENED: { label: 'Reopened', tint: C.marigold, ink: C.marigoldInk, spine: C.marigold },
  RESOLVED: { label: 'Resolved', tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  CLOSED: { label: 'Closed', tint: C.violetTint, ink: '#4A4776', spine: C.violet },
};

function metaFor(status = '') {
  const s = String(status).toUpperCase().replace(/\s+/g, '_');
  if (s.includes('ESCALAT')) return STATE_META.ESCALATED;
  if (s.includes('REOPEN')) return STATE_META.REOPENED;
  if (s.includes('IN_PROGRESS') || s.includes('PENDING')) return STATE_META.IN_PROGRESS;
  if (s.includes('RESOLV')) return STATE_META.RESOLVED;
  if (s.includes('CLOS')) return STATE_META.CLOSED;
  return STATE_META.OPEN;
}

function initialsOf(name = '') {
  const parts = String(name).trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function dutyLine() {
  return new Date()
    .toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

export default function AgentDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { data: stats, isLoading, isError, error, refetch, isRefetching } = useAgentStats();

  const summary = stats?.summary || {};
  const recentTickets = stats?.recentTickets || [];

  

  const activeCount = parseInt(pickStat(summary, ['active', 'open', 'assigned'])) || 0;
  const escalatedCount = parseInt(pickStat(summary, ['escalat'])) || 0;
  const resolvedCount = parseInt(pickStat(summary, ['resolv', 'clos'])) || 0;

  // Split of the workload bar, from whatever the queue actually holds.
  const split = useMemo(() => {
    const inProgress = recentTickets.filter((t) => metaFor(t.status) === STATE_META.IN_PROGRESS).length;
    const fresh = Math.max(activeCount - inProgress - escalatedCount, 0);
    return { fresh, inProgress, escalated: escalatedCount };
  }, [recentTickets, activeCount, escalatedCount]);

  if (isLoading) return <LoadingState label="Loading workspace…" />;

  if (isError) {
    return (
      <ErrorState
        title="Couldn’t load your queue"
        message={error?.message || 'Failed to load dashboard stats.'}
        onRetry={refetch}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violet} />
      }
    >
      {/* Header */}
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>On duty · {dutyLine()}</Text>
          <Text style={styles.name}>
            {user?.name?.split(' ')[0] || 'Agent'}’s queue
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(agent)/profile')}>
          <View style={styles.meAvatar}>
            <Text style={styles.meAvatarText}>{initialsOf(user?.name || 'Agent')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Workload hero */}
      <TouchableOpacity
        style={styles.workload}
        activeOpacity={0.9}
        onPress={() => router.push('/(agent)/tickets')}
      >
        <View style={styles.workloadTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.workloadLabel}>Assigned to you</Text>
            <View style={styles.workloadNumLine}>
              <Text style={styles.workloadNum}>{activeCount}</Text>
              <Text style={styles.workloadUnit}>open tickets</Text>
            </View>
          </View>
          <View style={styles.workloadArrow}>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.bar}>
          <View style={[styles.barSeg, { flex: split.fresh || 0.001, backgroundColor: C.mintSpine }]} />
          <View
            style={[styles.barSeg, { flex: split.inProgress || 0.001, backgroundColor: C.violetLight }]}
          />
          <View
            style={[styles.barSeg, { flex: split.escalated || 0.001, backgroundColor: C.coralSpine }]}
          />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.mintSpine }]} />
            <Text style={styles.legendText}>{split.fresh} new</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.violetLight }]} />
            <Text style={styles.legendText}>{split.inProgress} in progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: C.coralSpine }]} />
            <Text style={styles.legendText}>{split.escalated} escalated</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Escalation alarm + resolved */}
      <View style={styles.pairRow}>
        <TouchableOpacity
          style={[styles.tile, styles.alarm, escalatedCount === 0 && styles.alarmQuiet]}
          activeOpacity={0.9}
          onPress={() => router.push('/(agent)/tickets')}
        >
          <View style={styles.alarmHead}>
            <Feather
              name="alert-triangle"
              size={14}
              color={escalatedCount === 0 ? C.inkFaint : onCoral}
            />
            <Text style={[styles.alarmLabel, escalatedCount === 0 && { color: C.inkFaint }]}>
              Escalated
            </Text>
          </View>
          <View style={styles.alarmNumLine}>
            <Text style={[styles.alarmNum, escalatedCount === 0 && { color: C.ink }]}>
              {escalatedCount}
            </Text>
            <Text style={[styles.alarmUnit, escalatedCount === 0 && { color: C.inkMuted }]}>
              {escalatedCount === 0 ? 'all clear' : 'need you now'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.tile, { backgroundColor: C.mint, flex: 1 }]}>
          <Text style={styles.resolvedNum}>{resolvedCount}</Text>
          <Text style={styles.resolvedLabel}>Resolved</Text>
          <Text style={styles.resolvedFoot}>All time</Text>
        </View>
      </View>

      {/* Queue */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Work the queue</Text>
        {recentTickets.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(agent)/tickets')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {recentTickets.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="coffee" size={26} color={C.violetInk} />
            </View>
            <Text style={styles.emptyTitle}>Inbox zero</Text>
            <Text style={styles.emptyText}>Nothing is assigned to you right now.</Text>
          </View>
        ) : (
          recentTickets.map((ticket, index) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={index}
              role={user?.role}
              onPress={() => router.push(`/(agent)/tickets/${ticket.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const shadow = (color, opacity, radius, y, elevation) =>
  Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: y }, shadowOpacity: opacity, shadowRadius: radius },
    android: { elevation },
  });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 36 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  eyebrow: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.inkFaint,
  },
  name: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, color: C.ink, marginTop: 3 },
  meAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.violetTintWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meAvatarText: { fontSize: 14.5, fontWeight: '700', color: C.violetInk },

  /* Workload */
  workload: {
    marginTop: 20,
    marginHorizontal: 16,
    backgroundColor: C.ink,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    ...shadow(C.ink, 0.18, 26, 8, 6),
  },
  workloadTop: { flexDirection: 'row', alignItems: 'flex-start' },
  workloadLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: onDark,
  },
  workloadNumLine: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 8 },
  workloadNum: { fontSize: 50, fontWeight: '800', letterSpacing: -2.4, color: '#FFFFFF' },
  workloadUnit: { fontSize: 14, fontWeight: '600', color: onDark },
  workloadArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: { flexDirection: 'row', gap: 4, marginTop: 18 },
  barSeg: { height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 11, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11.5, fontWeight: '600', color: onDark },

  /* Pair */
  pairRow: { flexDirection: 'row', gap: 11, marginTop: 11, marginHorizontal: 16 },
  tile: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 15, minHeight: 92 },
  alarm: { flex: 1.35, backgroundColor: C.coral },
  alarmQuiet: { backgroundColor: C.card },
  alarmHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  alarmLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: onCoral,
  },
  alarmNumLine: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 9 },
  alarmNum: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: '#FFFFFF' },
  alarmUnit: { fontSize: 12, fontWeight: '600', color: onCoral, flexShrink: 1 },
  resolvedNum: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: C.mintInk },
  resolvedLabel: { fontSize: 11.5, fontWeight: '600', color: C.mintInk2, marginTop: 5 },
  resolvedFoot: { fontSize: 11, fontWeight: '600', color: C.mintSpine, marginTop: 7 },

  /* Section */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3, color: C.ink },
  viewAll: { fontSize: 12.5, fontWeight: '700', color: C.violet },

  /* Queue — TicketCard carries its own 16px side margins */
  list: {},

  /* Empty */
  empty: {
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 22,
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.violetTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15.5, fontWeight: '800', color: C.ink, marginBottom: 5 },
  emptyText: { fontSize: 13, color: C.inkMuted, textAlign: 'center', lineHeight: 19 },
});
