// src/components/TicketStaffTools.js
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import TicketOutageForm from './TicketOutageForm';
import TicketRCAForm from './TicketRCAForm';
import TicketReassignForm from './TicketReassignForm';
import { T } from './ticketTheme';
import TicketReplyToggle from './TicketReplyToggle';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];
const TABS = [
  { key: 'rca', label: 'Root cause', icon: 'file-text' },
  { key: 'outage', label: 'Outage', icon: 'wifi-off' },
  { key: 'reassign', label: 'Assign', icon: 'user-check' },
];

export default function TicketStaffTools({ ticket }) {
  const user = useAuthStore((state) => state.user);
  const isStaff = STAFF_ROLES.includes(user?.role);
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reassign');

  if (!isStaff || !ticket) return null;

  const isResolvedOrClosed = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  // Hide the RCA tab until the ticket is resolved or closed.
  const visibleTabs = TABS.filter((tab) => tab.key !== 'rca' || isResolvedOrClosed);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setModalOpen(true)}>
        <View style={styles.triggerChip}>
          <Feather name="tool" size={17} color={T.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.triggerLabel}>Staff tools</Text>
          <Text style={styles.triggerNote}>Assign, log an outage{isResolvedOrClosed ? ', write the root cause' : ''}</Text>
        </View>
        <Feather name="chevron-right" size={18} color="#C3CDDB" />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top + 10 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Staff tools</Text>
              <Text style={styles.subtitle}>Ticket #{ticket.ticket_no}</Text>
            </View>
            <Pressable onPress={() => setModalOpen(false)} style={styles.closeButton} hitSlop={8}>
              <Feather name="x" size={18} color={T.body} />
            </Pressable>
          </View>
          <View className="px-5 pb-4">
            <TicketReplyToggle ticket={ticket} />
          </View>
          <View style={styles.tabRow}>
            {visibleTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Feather name={tab.icon} size={14} color={active ? '#FFFFFF' : T.muted} />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.content}>
            {activeTab === 'rca' && isResolvedOrClosed ? (
              <TicketRCAForm ticket={ticket} onDone={() => setModalOpen(false)} />
            ) : null}
            {activeTab === 'outage' ? <TicketOutageForm ticket={ticket} onDone={() => setModalOpen(false)} /> : null}
            {activeTab === 'reassign' ? <TicketReassignForm ticket={ticket} onDone={() => setModalOpen(false)} /> : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: T.field,
    marginTop: 2,
  },
  triggerChip: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  triggerLabel: { fontSize: 14.5, fontWeight: '600', color: T.ink },
  triggerNote: { fontSize: 11.5, color: T.muted, marginTop: 2 },

  modal: { flex: 1, backgroundColor: T.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 21, fontWeight: '700', letterSpacing: -0.5, color: T.ink },
  subtitle: { fontSize: 12.5, color: T.muted, marginTop: 3 },
  closeButton: { width: 36, height: 36, borderRadius: 999, backgroundColor: T.field, alignItems: 'center', justifyContent: 'center' },

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 18 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 42,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: T.field,
  },
  tabActive: { backgroundColor: T.ink },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  tabLabelActive: { color: '#FFFFFF' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
});
