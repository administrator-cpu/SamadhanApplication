// src/components/TicketReassignForm.js
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAgents, useReassignTicket } from '../hooks/useTickets';
import { haptics } from '../utils/haptics';
import { T } from './ticketTheme';

export default function TicketReassignForm({ ticket, onDone }) {
  const { data: agents, isLoading } = useAgents();
  const { mutate, isPending, error } = useReassignTicket(ticket?.id);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={T.blue} />
        <Text style={styles.loadingText}>Loading the team…</Text>
      </View>
    );
  }

  const handleAssign = (employeeId) => {
    const payload = String(employeeId);
    mutate(payload, {
      onSuccess: () => {
        haptics.success();
        onDone?.();
      },
      onError: () => haptics.error(),
    });
  };

  const list = agents || [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
      {error ? (
        <Text style={styles.error}>{error.message || 'That reassignment did not go through.'}</Text>
      ) : null}

      <View style={styles.intro}>
        <View style={styles.introChip}>
          <Feather name="user-check" size={16} color={T.blue} />
        </View>
        <Text style={styles.introText}>
          The customer sees the new agent's name in the chat straight away.
        </Text>
      </View>

      {list.length === 0 ? (
        <Text style={styles.empty}>No agents available to assign right now.</Text>
      ) : (
        <View style={{ marginTop: 16, gap: 8 }}>
          {list.map((agent, index) => {
            const agentId = agent.id ?? agent.employee_row_id;
            const isCurrent =
              String(ticket?.assigned_employee?.employee_row_id ?? ticket?.assigned_employee?.id) === String(agentId);
            return (
              <Pressable
                key={agentId ?? index}
                onPress={() => handleAssign(agentId)}
                disabled={isPending || isCurrent}
                style={[styles.row, isCurrent && styles.rowCurrent, isPending && !isCurrent && styles.rowBusy]}
              >
                <View style={[styles.avatar, isCurrent && { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.avatarText, isCurrent && { color: T.greenInk }]}>
                    {agent.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{agent.name}</Text>
                  <Text style={[styles.role, isCurrent && { color: T.greenInk }]}>
                    {isCurrent ? 'Handling this ticket' : agent.role || 'Support agent'}
                  </Text>
                </View>
                {isCurrent ? (
                  <Feather name="check-circle" size={19} color={T.green} />
                ) : (
                  <Feather name="chevron-right" size={18} color="#C3CDDB" />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText: { fontSize: 12.5, color: T.muted },
  error: { fontSize: 13, lineHeight: 19, color: T.dangerInk, marginBottom: 12 },

  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.field, borderRadius: 18, padding: 14 },
  introChip: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: T.body },

  empty: { fontSize: 13, color: T.muted, textAlign: 'center', paddingVertical: 26 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: T.field,
  },
  rowCurrent: { backgroundColor: T.greenTint },
  rowBusy: { opacity: 0.5 },
  avatar: { width: 40, height: 40, borderRadius: 999, backgroundColor: T.blueTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: T.blueInk },
  name: { fontSize: 14.5, fontWeight: '600', color: T.ink },
  role: { fontSize: 11.5, color: T.muted, marginTop: 2 },
});
