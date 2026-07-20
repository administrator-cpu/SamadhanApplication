// src/components/TicketStaffTools.js
import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import TicketRCAForm from './TicketRCAForm';
import TicketOutageForm from './TicketOutageForm';
import TicketReassignForm from './TicketReassignForm';

const STAFF_ROLES = ['SUPPORT_AGENT', 'ADMIN'];
const TABS = [
  { key: 'rca', label: 'RCA', icon: 'file-text' },
  { key: 'outage', label: 'Outage', icon: 'wifi-off' },
  { key: 'reassign', label: 'Reassign', icon: 'user-check' },
];

export default function TicketStaffTools({ ticket }) {
  const user = useAuthStore((state) => state.user);
  const isStaff = STAFF_ROLES.includes(user?.role);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rca');

  if (!isStaff || !ticket) return null;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setModalOpen(true)}>
        <Feather name="tool" size={15} color="#4b5563" />
        <Text style={styles.triggerText}>Staff Tools</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Staff Tools — {ticket.ticket_no}</Text>
            <Pressable onPress={() => setModalOpen(false)}>
              <Feather name="x" size={22} color="#0f172a" />
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
              >
                <Feather name={tab.icon} size={14} color={activeTab === tab.key ? '#2563eb' : '#64748b'} />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'rca' && <TicketRCAForm ticket={ticket} onDone={() => setModalOpen(false)} />}
            {activeTab === 'outage' && <TicketOutageForm ticket={ticket} onDone={() => setModalOpen(false)} />}
            {activeTab === 'reassign' && <TicketReassignForm ticket={ticket} onDone={() => setModalOpen(false)} />}
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
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  triggerText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  modalContainer: { flex: 1, backgroundColor: '#ffffff', paddingTop: 50 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  tabButtonActive: { backgroundColor: '#eff6ff' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabLabelActive: { color: '#2563eb' },
  tabContent: { padding: 16, flex: 1 },
});