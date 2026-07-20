// src/components/TicketReassignForm.js
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAgents, useReassignTicket } from '../hooks/useTickets';

export default function TicketReassignForm({ ticket, onDone }) {
  const { data: agents, isLoading } = useAgents();
  const { mutate, isPending, error } = useReassignTicket(ticket?.id);

  if (isLoading) {
    return <ActivityIndicator color="#3b82f6" style={{ marginVertical: 20 }} />;
  }

const handleAssign = (employeeId) => {
  const payload = String(employeeId);
  mutate(payload, {
    onSuccess: () => onDone?.(),
  });
};

  return (
    <View>
      {error ? (
        <Text style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>
          {error.message || 'Failed to reassign ticket.'}
        </Text>
      ) : null}

      {(agents || []).map((agent, index) => {
        const agentId = agent.id ?? agent.employee_row_id;
        const isCurrent = String(ticket?.assigned_employee?.employee_row_id ?? ticket?.assigned_employee?.id) === String(agentId);
        return (
          <Pressable
            key={agentId ?? index}
            onPress={() => handleAssign(agentId)}
            disabled={isPending || isCurrent}
            style={[styles.row, isCurrent && styles.rowCurrent]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{agent.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.agentName}>{agent.name}</Text>
            {isCurrent && <Feather name="check-circle" size={18} color="#16a34a" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowCurrent: { backgroundColor: '#f0fdf4' },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#2563eb', fontWeight: '700' },
  agentName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#0f172a' },
});