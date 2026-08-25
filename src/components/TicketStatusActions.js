// src/components/TicketStatusActions.js
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useUpdateTicketStatus } from '../hooks/useTickets';
import { useAuthStore } from '../store/authStore';
import { haptics } from '../utils/haptics';
import { canReopen } from '../utils/ticketStatus';
import ConfirmDialog from './ConfirmDialog';
import { T } from './ticketTheme';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];

// Each action carries the plain sentence a user would actually say.
const STAFF_TRANSITIONS = {
  OPEN: [
    { to: 'ESCALATED', label: 'Escalate', note: 'Hand to senior team', icon: 'arrow-up-circle', color: T.amberInk, tint: T.amberTint },
    { to: 'RESOLVED', label: 'Mark resolved', note: 'Tell the customer it works', icon: 'check-circle', color: T.greenInk, tint: T.greenTint },
  ],
  IN_PROGRESS: [
    { to: 'ESCALATED', label: 'Escalate', note: 'Hand to senior team', icon: 'arrow-up-circle', color: T.amberInk, tint: T.amberTint },
    { to: 'RESOLVED', label: 'Mark resolved', note: 'Tell the customer it works', icon: 'check-circle', color: T.greenInk, tint: T.greenTint },
  ],
  ESCALATED: [
    { to: 'RESOLVED', label: 'Mark resolved', note: 'Tell the customer it works', icon: 'check-circle', color: T.greenInk, tint: T.greenTint },
  ],
  RESOLVED: [
    { to: 'CLOSED', label: 'Close ticket', note: 'Locks the thread', icon: 'archive', color: T.body, tint: T.field },
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
  const [reopenReason, setReopenReason] = useState('');

  if (!ticket) return null;

  const staffOptions = isStaff ? STAFF_TRANSITIONS[ticket.status] || [] : [];
  const reopenAvailable = canReopen(ticket);

  if (staffOptions.length === 0 && !reopenAvailable) return null;

  const closeDialog = () => {
    setDialogTarget(null);
    setReopenReason('');
  };

  const handleConfirm = () => {
    const targetStatus = dialogTarget;
    const payload =
      targetStatus === 'REOPENED' ? { status: targetStatus, message: reopenReason } : { status: targetStatus };

    closeDialog();
    setPendingStatus(targetStatus);
    mutate(payload, {
      onSuccess: () => haptics.success(),
      onError: () => haptics.error(),
      onSettled: () => setPendingStatus(null),
    });
  };

  const dialogConfig = dialogTarget ? DIALOG_CONFIG[dialogTarget] : null;
  const isReopenDialog = dialogTarget === 'REOPENED';

  return (
    <>
      <View style={styles.container}>
        {staffOptions.map((option) => (
          <ActionRow
            key={option.to}
            label={option.label}
            note={option.note}
            icon={option.icon}
            color={option.color}
            tint={option.tint}
            isLoading={isPending && pendingStatus === option.to}
            disabled={isPending}
            onPress={() => setDialogTarget(option.to)}
          />
        ))}

        {reopenAvailable ? (
          <ActionRow
            label="Reopen this ticket"
            note="Picks up where we left off"
            icon="rotate-ccw"
            color={T.violet}
            tint={T.violetTint}
            isLoading={isPending && pendingStatus === 'REOPENED'}
            disabled={isPending}
            onPress={() => setDialogTarget('REOPENED')}
          />
        ) : null}
      </View>

      <ConfirmDialog
        visible={!!dialogTarget}
        title={dialogConfig?.title}
        message={dialogConfig?.message}
        icon={dialogConfig?.icon}
        accentColor={dialogConfig?.accentColor}
        destructive={dialogConfig?.destructive}
        confirmLabel={dialogConfig?.confirmLabel}
        showInput={isReopenDialog}
        inputValue={reopenReason}
        onInputChange={setReopenReason}
        inputPlaceholder="Reason for reopening (optional)"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}

function ActionRow({ label, note, icon, color, tint, isLoading, disabled, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={[styles.chip, { backgroundColor: tint }]}>
        {isLoading ? <ActivityIndicator size="small" color={color} /> : <Feather name={icon} size={17} color={color} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#C3CDDB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: T.field,
  },
  rowDisabled: { opacity: 0.5 },
  chip: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  rowLabel: { fontSize: 14.5, fontWeight: '600', color: T.ink },
  rowNote: { fontSize: 11.5, color: T.muted, marginTop: 2 },
});
