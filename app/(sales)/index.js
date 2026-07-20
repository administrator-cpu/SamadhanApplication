// app/(sales)/index.js
import { useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, // Changed from Pressable
  ActivityIndicator, 
  RefreshControl, 
  StyleSheet,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTickets } from '../../src/hooks/useTickets';
import { statusLabel } from '../../src/utils/ticketStatus';

const STATUS_COLORS = {
  OPEN: { bg: '#eff6ff', text: '#3b82f6' },
  IN_PROGRESS: { bg: '#fefce8', text: '#eab308' },
  ESCALATED: { bg: '#fef2f2', text: '#ef4444' },
  RESOLVED: { bg: '#f0fdf4', text: '#22c55e' },
  CLOSED: { bg: '#f1f5f9', text: '#64748b' },
  REOPENED: { bg: '#faf5ff', text: '#a855f7' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function SalesDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, refetch, isRefetching } = useTickets({});
  const allTickets = useMemo(() => data?.pages.flatMap((p) => p.tickets) ?? [], [data]);

  const activeTickets = allTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'ESCALATED'].includes(t.status));
  const closedTickets = allTickets.filter((t) => t.status === 'CLOSED');
  const resolvedTickets = allTickets.filter((t) => t.status === 'RESOLVED');
  const recentTickets = allTickets.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3b82f6" />
      }
    >
      {/* Header Section */}
      <View style={styles.hero}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{user?.name?.split(' ')[0] || 'there'}</Text>
        </View>
        <View style={styles.avatarPlaceholder}>
          <Feather name="user" size={20} color="#3b82f6" />
        </View>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.raiseCard}
        activeOpacity={0.85}
        onPress={() => router.push('/(sales)/raise-ticket')}
      >
        <View style={styles.raiseIconWrap}>
          <Feather name="plus" size={24} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.raiseTitle}>Raise a Ticket</Text>
          <Text style={styles.raiseSubtitle}>Report an issue for a customer</Text>
        </View>
        <View style={styles.chevronWrap}>
          <Feather name="chevron-right" size={20} color="#2563eb" />
        </View>
      </TouchableOpacity>

      {/* Statistics Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <StatCard icon="layers" label="Total Raised" value={allTickets.length} color="#0f172a" />
          <StatCard icon="activity" label="Active" value={activeTickets.length} color="#3b82f6" />
        </View>
        <View style={styles.statsRow}>
          <StatCard icon="check-circle" label="Resolved" value={resolvedTickets.length} color="#10b981" />
          <StatCard icon="archive" label="Closed" value={closedTickets.length} color="#64748b" />
        </View>
      </View>

      {/* Recent Tickets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Tickets</Text>
          {allTickets.length > 0 && (
            <TouchableOpacity 
              onPress={() => router.push('/(sales)/tickets')} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Fetching tickets...</Text>
          </View>
        ) : recentTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Feather name="inbox" size={32} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptyText}>You haven't raised any tickets yet.</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              activeOpacity={0.8}
              onPress={() => router.push('/(sales)/raise-ticket')}
            >
              <Text style={styles.emptyButtonText}>Raise your first ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTickets.map((ticket) => {
            const colors = STATUS_COLORS[ticket.status] || STATUS_COLORS.CLOSED;
            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketRow}
                activeOpacity={0.7}
                onPress={() => router.push(`/(sales)/tickets/${ticket.id}`)}
              >
                <View style={styles.ticketIconWrap}>
                  <View style={[styles.statusIndicator, { backgroundColor: colors.text }]} />
                  <Feather name="file-text" size={20} color="#64748b" />
                </View>
                
                <View style={styles.ticketContent}>
                  <Text style={styles.ticketNo}>{ticket.ticket_no}</Text>
                  <Text style={styles.ticketDesc} numberOfLines={1}>
                    {ticket.customer?.name || ticket.circuit_description || 'General Ticket'}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                    {statusLabel(ticket.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// --- Components ---

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  contentContainer: { 
    paddingBottom: 40 
  },

  /* Hero Section */
  hero: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingTop: 32, 
    paddingBottom: 24 
  },
  heroTextContainer: {
    flex: 1,
  },
  greeting: { 
    fontSize: 14, 
    color: '#64748b', 
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0f172a', 
    marginTop: 4 
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  /* Raise Ticket Card */
  raiseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  raiseIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseTitle: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  raiseSubtitle: { 
    color: '#bfdbfe', 
    fontSize: 13, 
    marginTop: 4 
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Statistics Grid */
  statsContainer: { 
    paddingHorizontal: 24, 
    marginTop: 28,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { 
    fontSize: 24, 
    fontWeight: '800' 
  },
  statLabel: { 
    fontSize: 13, 
    color: '#64748b',
    fontWeight: '500'
  },

  /* Section Header */
  section: { 
    paddingHorizontal: 24, 
    marginTop: 32 
  },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0f172a' 
  },
  viewAllText: { 
    fontSize: 14, 
    color: '#2563eb', 
    fontWeight: '600' 
  },

  /* Loading & Empty States */
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 40, 
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyText: { 
    fontSize: 14, 
    color: '#64748b',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 99,
  },
  emptyButtonText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },

  /* Ticket List */
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  ticketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  statusIndicator: { 
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10, 
    height: 10, 
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 1,
  },
  ticketContent: { 
    flex: 1,
    marginRight: 12,
  },
  ticketNo: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  ticketDesc: { 
    fontSize: 13, 
    color: '#64748b', 
    marginTop: 4 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  statusBadgeText: { 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});