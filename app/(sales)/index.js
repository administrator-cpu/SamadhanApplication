// app/(sales)/index.js
// Sales dashboard — vivid bento redesign (33a). Matches the palette and rhythm
// of the redesigned ticket list: one violet action block, a colour-block
// scoreboard, then a triage list where the customer name leads.
import { useMemo } from 'react';
import {
  ActivityIndicator,
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
import { useTickets } from '../../src/hooks/useTickets';
import { statusLabel } from '../../src/utils/ticketStatus';

/* ---------------------------------------------------------------- */
/* Design tokens — shared with TicketListScreen                      */
/* ---------------------------------------------------------------- */

const C = {
  bg: '#F3F2FD',
  card: '#FFFFFF',
  ink: '#151233',
  inkMuted: '#6D6A96',
  inkFaint: '#9D9AC0',
  monoFaint: '#C3C0E2',
  hair: '#F1F0FB',
  violet: '#6C5CE7',
  violetDeep: '#5A48D6',
  violetLight: '#8271EF',
  violetTint: '#EBE8FF',
  violetTintWarm: '#E6E1FF',
  violetInk: '#4A34C7',
  onDark: '#B7B2E8',
  onViolet: '#D8D2FF',
  onVioletFaint: '#BDB3FF',
  mint: '#CCF7E4',
  mintInk: '#0D6B4B',
  mintInk2: '#0F7A56',
  mintSpine: '#12B886',
  marigold: '#FFD166',
  marigoldInk: '#6B4800',
  coral: '#C2410C',
  coralSpine: '#FF8A3D',
};

const STATUS_META = {
  OPEN: { tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  IN_PROGRESS: { tint: C.violetTint, ink: C.violetInk, spine: C.violet },
  ESCALATED: { tint: C.coral, ink: '#FFFFFF', spine: C.coralSpine },
  REOPENED: { tint: C.marigold, ink: C.marigoldInk, spine: C.marigold },
  RESOLVED: { tint: C.mint, ink: C.mintInk2, spine: C.mintSpine },
  CLOSED: { tint: C.violetTint, ink: '#4A4776', spine: C.violet },
};

const AVATAR_BG = [C.violetTintWarm, C.mint, C.marigold];
const AVATAR_INK = [C.violetInk, C.mintInk, C.marigoldInk];

const ATTENTION = ['ESCALATED', 'REOPENED', 'OPEN', 'IN_PROGRESS'];

function initialsOf(name = '') {
  const parts = String(name).trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function avatarIndex(key = '') {
  let n = 0;
  for (let i = 0; i < key.length; i++) n = (n + key.charCodeAt(i)) % 3;
  return n;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Avatar({ name, size = 38, radius = 13, fontSize = 12.5 }) {
  const i = avatarIndex(name || '');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: radius, backgroundColor: AVATAR_BG[i] },
      ]}
    >
      <Text style={{ fontSize, fontWeight: '700', color: AVATAR_INK[i] }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

export default function SalesDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, refetch, isRefetching } = useTickets({});
  const allTickets = useMemo(() => data?.pages.flatMap((p) => p.tickets) ?? [], [data]);

  const activeTickets = useMemo(
    () => allTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(t.status)),
    [allTickets]
  );
  const resolvedTickets = useMemo(
    () => allTickets.filter((t) => t.status === 'RESOLVED'),
    [allTickets]
  );
  const escalatedCount = useMemo(
    () => allTickets.filter((t) => t.status === 'ESCALATED').length,
    [allTickets]
  );

  // Split of the "active now" bar: open / in progress / escalated.
  const activeSplit = useMemo(() => {
    const open = activeTickets.filter((t) => t.status === 'OPEN').length;
    const prog = activeTickets.filter((t) => t.status === 'IN_PROGRESS').length;
    return { open: open || 0, prog: prog || 0, esc: escalatedCount || 0 };
  }, [activeTickets, escalatedCount]);

  // Recent customers — unique, newest first, for the one-tap raise path.
  const recentCustomers = useMemo(() => {
    const seen = new Map();
    for (const t of allTickets) {
      const c = t.customer;
      if (!c?.id || seen.has(c.id)) continue;
      seen.set(c.id, c);
      if (seen.size === 6) break;
    }
    return Array.from(seen.values());
  }, [allTickets]);

  // Attention list — escalated and reopened first, then the rest.
  const attentionTickets = useMemo(() => {
    return [...allTickets]
      .filter((t) => ATTENTION.includes(t.status))
      .sort((a, b) => ATTENTION.indexOf(a.status) - ATTENTION.indexOf(b.status))
      .slice(0, 5);
  }, [allTickets]);

  // The book — every customer in reach, with their live open count. Doubles as
  // the one-tap raise path once the attention list is short.
  const book = useMemo(() => {
    const map = new Map();
    for (const t of allTickets) {
      const c = t.customer;
      if (!c?.id) continue;
      const entry = map.get(c.id) || { customer: c, open: 0, total: 0 };
      entry.total += 1;
      if (['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(t.status)) entry.open += 1;
      map.set(c.id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.open - a.open || b.total - a.total);
  }, [allTickets]);

  const goRaise = (customer) =>
    router.push({
      pathname: '/(sales)/raise-ticket',
      params: customer ? { customerId: String(customer.id), customerName: customer.name } : {},
    });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 10 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.violet} />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.name?.split(' ')[0] || 'there'}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(sales)/profile')}>
          <View style={styles.meAvatar}>
            <Text style={styles.meAvatarText}>{initialsOf(user?.name || 'You')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Raise block — the on-behalf-of action */}
      <View style={styles.raiseBlock}>
        <TouchableOpacity
          style={styles.raiseTop}
          activeOpacity={0.85}
          onPress={() => goRaise(null)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.raiseTitle}>Raise a ticket{'\n'}on behalf of a customer</Text>
            <Text style={styles.raiseSubtitle}>
              Pick a customer, describe the fault, we route it.
            </Text>
          </View>
          <View style={styles.raisePlus}>
            <Feather name="plus" size={19} color={C.violetDeep} />
          </View>
        </TouchableOpacity>

        {recentCustomers.length > 0 && (
          <>
            <View style={styles.raiseDivider} />
            <Text style={styles.raiseLabel}>Recent customers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 9 }}
            >
              {recentCustomers.slice(0, 3).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.quickPick}
                  activeOpacity={0.8}
                  onPress={() => goRaise(c)}
                >
                  <Avatar name={c.name} size={25} radius={13} fontSize={10} />
                  <Text style={styles.quickPickText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {recentCustomers.length > 3 && (
                <TouchableOpacity
                  style={styles.quickMore}
                  activeOpacity={0.8}
                  onPress={() => goRaise(null)}
                >
                  <Text style={styles.quickMoreText}>+{recentCustomers.length - 3}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* Scoreboard */}
      <View style={styles.bento}>
        <View style={styles.bentoRow}>
          <TouchableOpacity
            style={[styles.tile, styles.tileDark]}
            activeOpacity={0.85}
            onPress={() => router.push('/(sales)/tickets')}
          >
            <Text style={styles.bigNumOnDark}>{activeTickets.length}</Text>
            <Text style={styles.tileLabelOnDark}>Active now</Text>
            <View style={styles.bar}>
              <View
                style={[styles.barSeg, { flex: activeSplit.open || 1, backgroundColor: C.mintSpine }]}
              />
              <View
                style={[styles.barSeg, { flex: activeSplit.prog || 1, backgroundColor: C.violetLight }]}
              />
              <View
                style={[styles.barSeg, { flex: activeSplit.esc || 1, backgroundColor: C.coralSpine }]}
              />
            </View>
          </TouchableOpacity>

          <View style={[styles.tile, { backgroundColor: C.mint }]}>
            <Text style={[styles.bigNum, { color: C.mintInk }]}>{resolvedTickets.length}</Text>
            <Text style={[styles.tileLabel, { color: C.mintInk2 }]}>Resolved</Text>
            <Text style={styles.tileFoot}>All time</Text>
          </View>
        </View>

        <View style={styles.bentoRow}>
          <TouchableOpacity
            style={[styles.tileFlat]}
            activeOpacity={0.85}
            onPress={() => router.push('/(sales)/tickets')}
          >
            <View>
              <Text style={styles.midNum}>{escalatedCount}</Text>
              <Text style={styles.tileLabelSm}>Escalated</Text>
            </View>
            <View style={styles.dot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tileFlat]}
            activeOpacity={0.85}
            onPress={() => router.push('/(sales)/tickets')}
          >
            <View>
              <Text style={styles.midNum}>{allTickets.length}</Text>
              <Text style={styles.tileLabelSm}>Total raised</Text>
            </View>
            <Feather name="chevron-right" size={15} color={C.monoFaint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Attention list */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Needs your attention</Text>
        {allTickets.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(sales)/tickets')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={C.violet} />
            <Text style={styles.loadingText}>Fetching tickets…</Text>
          </View>
        ) : attentionTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={28} color={C.inkFaint} />
            </View>
            <Text style={styles.emptyTitle}>
              {allTickets.length === 0 ? 'No tickets yet' : 'Nothing needs you'}
            </Text>
            <Text style={styles.emptyText}>
              {allTickets.length === 0
                ? 'Raise one on behalf of a customer to get started.'
                : 'Every ticket in your book is resolved or closed.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.85}
              onPress={() => goRaise(null)}
            >
              <Text style={styles.emptyBtnText}>Raise a ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          attentionTickets.map((ticket) => {
            const meta = STATUS_META[ticket.status] || STATUS_META.CLOSED;
            const who = ticket.customer?.name || 'General';
            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => router.push(`/(sales)/tickets/${ticket.id}`)}
              >
                <View style={[styles.spine, { backgroundColor: meta.spine }]} />
                <Avatar name={who} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleLine}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {who}
                    </Text>
                    <Text style={styles.rowNo}>{ticket.ticket_no}</Text>
                  </View>
                  <Text style={styles.rowDesc} numberOfLines={1}>
                    {ticket.circuit_description || ticket.title || 'No description'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: meta.tint }]}>
                  <Text style={[styles.badgeText, { color: meta.ink }]}>
                    {statusLabel(ticket.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Your book — fills the screen with the accounts, not with padding */}
      {book.length > 0 && (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Your book</Text>
            <Text style={styles.sectionCount}>{book.length} accounts</Text>
          </View>
          <View style={styles.list}>
            {book.slice(0, 6).map(({ customer, open, total }) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.bookRow}
                activeOpacity={0.75}
                onPress={() => goRaise(customer)}
              >
                <Avatar name={customer.name} size={36} radius={12} fontSize={12} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {customer.name}
                  </Text>
                  <Text style={styles.bookMeta}>
                    {open > 0 ? `${open} open · ${total} total` : `No open tickets · ${total} total`}
                  </Text>
                </View>
                <View style={styles.bookAdd}>
                  <Feather name="plus" size={13} color={C.violetInk} />
                  <Text style={styles.bookAddText}>Ticket</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const shadow = (opacity, radius, y, color) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation: y },
  });

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  contentContainer: { paddingBottom: 110 },

  /* Hero */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  greeting: {
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

  /* Raise block */
  raiseBlock: {
    marginTop: 22,
    marginHorizontal: 16,
    backgroundColor: C.violet,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    ...shadow(0.32, 30, 8, C.violet),
  },
  raiseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  raiseTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, color: '#FFFFFF', lineHeight: 24 },
  raiseSubtitle: { fontSize: 12.5, color: C.onViolet, marginTop: 7, lineHeight: 18 },
  raisePlus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 16,
    marginBottom: 13,
  },
  raiseLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: C.onVioletFaint,
    marginBottom: 10,
  },
  quickPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 13,
    paddingVertical: 6,
    maxWidth: 165,
  },
  quickPickText: { fontSize: 12.5, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },
  quickMore: {
    minWidth: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
  },
  quickMoreText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  /* Scoreboard */
  bento: { marginTop: 14, marginHorizontal: 16, gap: 11 },
  bentoRow: { flexDirection: 'row', gap: 11 },
  tile: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    minHeight: 108,
  },
  tileDark: { backgroundColor: C.ink },
  bigNum: { fontSize: 34, fontWeight: '800', letterSpacing: -1.4 },
  bigNumOnDark: { fontSize: 34, fontWeight: '800', letterSpacing: -1.4, color: '#FFFFFF' },
  tileLabel: { fontSize: 12, fontWeight: '600', marginTop: 5 },
  tileLabelOnDark: { fontSize: 12, fontWeight: '600', color: C.onDark, marginTop: 5 },
  tileFoot: { fontSize: 11.5, fontWeight: '600', color: C.mintSpine, marginTop: 11 },
  bar: { flexDirection: 'row', gap: 4, marginTop: 11 },
  barSeg: { height: 5, borderRadius: 3 },
  tileFlat: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  midNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7, color: C.ink },
  tileLabelSm: { fontSize: 11.5, fontWeight: '600', color: C.inkMuted, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.coralSpine },

  /* Section head */
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
  sectionCount: { fontSize: 12.5, fontWeight: '600', color: C.inkFaint },

  /* Book */
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  bookMeta: { fontSize: 12, color: C.inkMuted, marginTop: 3 },
  bookAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.violetTint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bookAddText: { fontSize: 11.5, fontWeight: '700', color: C.violetInk },

  /* Attention list */
  list: { marginHorizontal: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingLeft: 19,
    paddingRight: 15,
    overflow: 'hidden',
  },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  rowName: { fontSize: 14.5, fontWeight: '700', color: C.ink, flexShrink: 1 },
  rowNo: {
    fontSize: 11,
    fontWeight: '600',
    color: C.monoFaint,
    fontVariant: ['tabular-nums'],
  },
  rowDesc: { fontSize: 12.5, color: C.inkMuted, marginTop: 3 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

  /* States */
  loadingState: { paddingVertical: 44, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13.5, color: C.inkMuted },
  emptyState: {
    alignItems: 'center',
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
  emptyText: { fontSize: 13, color: C.inkMuted, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  emptyBtn: {
    backgroundColor: C.violet,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },
});
