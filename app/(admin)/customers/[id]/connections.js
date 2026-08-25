// app/(admin)/customers/[id]/connections.js
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCustomerConnections } from '../../../../src/hooks/useCustomers';

export default function CustomerConnections() {
  const { id } = useLocalSearchParams();
  const { data, isLoading, isError, error } = useCustomerConnections(id);

  const connections = data || [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'CRM Connections' }} />

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={36} color="#ef4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorText}>{error?.message || 'Failed to load connections.'}</Text>
        </View>
      ) : connections.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="wifi-off" size={28} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Active Connections</Text>
          <Text style={styles.emptyText}>
            This customer has no matching connections in the CRM system.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {connections.map((conn) => (
            <View key={conn.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Feather name="wifi" size={16} color="#16a34a" />
                </View>
                <Text style={styles.circuitId}>{conn.fabCircuitId}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Active</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <InfoRow label="Service Type" value={conn.serviceType} />
              <InfoRow label="Opportunity ID" value={conn.opportunityId} />
              <InfoRow label="A-End BTS" value={conn.aEndBtsId} />
              <InfoRow label="B-End BTS" value={conn.bEndBtsId} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitId: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { fontSize: 10, color: '#16a34a', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
});