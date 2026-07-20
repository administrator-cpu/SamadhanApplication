// src/components/TicketStatusActions.js
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useUpdateTicketStatus } from '../hooks/useTickets';
import { canReopen } from '../utils/ticketStatus';
import ConfirmDialog from './ConfirmDialog';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];

const STAFF_TRANSITIONS = {
  OPEN: [
    { to: 'ESCALATED', label: 'Escalate', icon: 'arrow-up-circle', color: '#ea580c' },
    { to: 'RESOLVED', label: 'Resolve', icon: 'check-circle', color: '#16a34a' },
  ],
  IN_PROGRESS: [
    { to: 'ESCALATED', label: 'Escalate', icon: 'arrow-up-circle', color: '#ea580c' },
    { to: 'RESOLVED', label: 'Resolve', icon: 'check-circle', color: '#16a34a' },
  ],
  ESCALATED: [
    { to: 'RESOLVED', label: 'Resolve', icon: 'check-circle', color: '#16a34a' },
  ],
  RESOLVED: [
    { to: 'CLOSED', label: 'Close', icon: 'archive', color: '#4b5563' },
  ],
};

const DIALOG_CONFIG = {
  ESCALATED: {
    title: 'Escalate Ticket',
    message: 'This flags the ticket for higher-priority attention from the team.',
    icon: 'arrow-up-circle',
    accentColor: '#ea580c',
    confirmLabel: 'Escalate',
  },
  RESOLVED: {
    title: 'Resolve Ticket',
    message: 'The customer will be notified that their issue has been resolved.',
    icon: 'check-circle',
    accentColor: '#16a34a',
    confirmLabel: 'Resolve',
  },
  CLOSED: {
    title: 'Close Ticket',
    message: 'This is final and locks further updates unless reopened within 24 hours.',
    icon: 'archive',
    accentColor: '#dc2626',
    destructive: true,
    confirmLabel: 'Close',
  },
  REOPENED: {
    title: 'Reopen Ticket',
    message: 'This ticket will return to Open status for further action.',
    icon: 'rotate-ccw',
    accentColor: '#7c3aed',
    confirmLabel: 'Reopen',
  },
};

export default function TicketStatusActions({ ticket }) {
  const user = useAuthStore((state) => state.user);
  const isStaff = STAFF_ROLES.includes(user?.role);
  const { mutate, isPending } = useUpdateTicketStatus(ticket?.id);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [dialogTarget, setDialogTarget] = useState(null); // status string or null

  if (!ticket) return null;

  const staffOptions = isStaff ? (STAFF_TRANSITIONS[ticket.status] || []) : [];
  const reopenAvailable = canReopen(ticket);

  if (staffOptions.length === 0 && !reopenAvailable) {
    return null;
  }

  const handleConfirm = () => {
    const targetStatus = dialogTarget;
    setDialogTarget(null);
    setPendingStatus(targetStatus);
    mutate({ status: targetStatus }, { onSettled: () => setPendingStatus(null) });
  };

  const dialogConfig = dialogTarget ? DIALOG_CONFIG[dialogTarget] : null;

  return (
    <>
      <View style={styles.container}>
        {staffOptions.map((option) => (
          <ActionButton
            key={option.to}
            label={option.label}
            icon={option.icon}
            color={option.color}
            isLoading={isPending && pendingStatus === option.to}
            disabled={isPending}
            onPress={() => setDialogTarget(option.to)}
          />
        ))}

        {reopenAvailable && (
          <ActionButton
            label="Reopen Ticket"
            icon="rotate-ccw"
            color="#7c3aed"
            isLoading={isPending && pendingStatus === 'REOPENED'}
            disabled={isPending}
            onPress={() => setDialogTarget('REOPENED')}
          />
        )}
      </View>

      <ConfirmDialog
        visible={!!dialogTarget}
        title={dialogConfig?.title}
        message={dialogConfig?.message}
        icon={dialogConfig?.icon}
        accentColor={dialogConfig?.accentColor}
        destructive={dialogConfig?.destructive}
        confirmLabel={dialogConfig?.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={() => setDialogTarget(null)}
      />
    </>
  );
}

function ActionButton({ label, icon, color, isLoading, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { borderColor: color }, disabled && styles.buttonDisabled]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Feather name={icon} size={15} color={color} />
      )}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 13, fontWeight: '600' },
});