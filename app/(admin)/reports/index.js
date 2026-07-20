// app/(admin)/reports/index.js
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ticketService } from '../../../src/api/ticketService';
import { useEarliestYear, useResolvedTickets } from '../../../src/hooks/useTickets';
import { ticketsToCsv } from '../../../src/utils/csv';
import { statusLabel } from '../../../src/utils/ticketStatus';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ResolutionLog() {
    const [page, setPage] = useState(1);
    const [exportModalOpen, setExportModalOpen] = useState(false);

    const { data, isLoading } = useResolvedTickets({ page, limit: 10 });
    const { data: earliestYearData } = useEarliestYear();

    const tickets = (data?.tickets || []).filter(Boolean);
    const pagination = data?.pagination;





    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Resolution Log</Text>
                <Pressable style={styles.exportButton} onPress={() => setExportModalOpen(true)}>
                    <Feather name="download" size={16} color="#ffffff" />
                    <Text style={styles.exportButtonText}>Export</Text>
                </Pressable>
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={(item, index) => String(item?.ticket_row_id ?? item?.id ?? index)}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <Text style={styles.ticketNo}>{item.ticket_no}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: item.status === 'CLOSED' ? '#f3f4f6' : '#f0fdf4' }]}>
                                    <Text style={[styles.statusBadgeText, { color: item.status === 'CLOSED' ? '#6b7280' : '#16a34a' }]}>
                                        {statusLabel(item.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.circuitDesc}>{item.circuit_description}</Text>
                            {item.rca ? (
                                <Text style={styles.rcaPreview} numberOfLines={2}>{item.rca}</Text>
                            ) : (
                                <Text style={styles.noRca}>No RCA recorded</Text>
                            )}
                            <Text style={styles.resolvedDate}>
                                Resolved: {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : '—'}
                            </Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No resolved tickets found.</Text>}
                    ListFooterComponent={
                        pagination && pagination.pages > 1 ? (
                            <View style={styles.paginationRow}>
                                <Pressable
                                    disabled={page <= 1}
                                    onPress={() => setPage((p) => p - 1)}
                                    style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                                >
                                    <Feather name="chevron-left" size={18} color={page <= 1 ? '#cbd5e1' : '#334155'} />
                                </Pressable>
                                <Text style={styles.pageLabel}>Page {pagination.currentPage} of {pagination.pages}</Text>
                                <Pressable
                                    disabled={page >= pagination.pages}
                                    onPress={() => setPage((p) => p + 1)}
                                    style={[styles.pageButton, page >= pagination.pages && styles.pageButtonDisabled]}
                                >
                                    <Feather name="chevron-right" size={18} color={page >= pagination.pages ? '#cbd5e1' : '#334155'} />
                                </Pressable>
                            </View>
                        ) : null
                    }
                />
            )}

            <ExportModal
                visible={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                earliestYear={earliestYearData?.year}
            />
        </View>
    );
}

function ExportModal({ visible, onClose, earliestYear }) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [isExporting, setIsExporting] = useState(false);

    const years = [];
    if (earliestYear) {
        for (let y = currentYear; y >= earliestYear; y--) years.push(y);
    } else {
        years.push(currentYear);
    }

const handleExport = async () => {
  setIsExporting(true);
  try {
    const tickets = await ticketService.getResolvedTicketsForExport(year, month);

    if (!tickets || tickets.length === 0) {
      Alert.alert('No data', 'No resolved tickets found for this period.');
      return;
    }

    const csvContent = ticketsToCsv(tickets);
    const fileUri = FileSystem.documentDirectory + `resolution-log-${year}-${month}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Resolution Log',
        UTI: 'public.comma-separated-values-text', // iOS
      });
    }

    onClose();
  } catch (err) {
    Alert.alert('Export failed', err.message || 'Please try again.');
  } finally {
    setIsExporting(false);
  }
};


    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Export Resolution Log</Text>
                        <Pressable onPress={onClose}>
                            <Feather name="x" size={22} color="#0f172a" />
                        </Pressable>
                    </View>

                    <Text style={styles.modalLabel}>Year</Text>
                    <View style={styles.chipsRow}>
                        {years.map((y) => (
                            <Pressable
                                key={y}
                                onPress={() => setYear(y)}
                                style={[styles.chip, year === y && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.modalLabel}>Month</Text>
                    <View style={styles.chipsRow}>
                        {MONTHS.map((m, index) => (
                            <Pressable
                                key={m}
                                onPress={() => setMonth(index + 1)}
                                style={[styles.chip, month === index + 1 && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, month === index + 1 && styles.chipTextActive]}>
                                    {m.slice(0, 3)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Pressable onPress={handleExport} disabled={isExporting} style={styles.downloadButton}>
                        {isExporting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <>
                                <Feather name="download" size={16} color="#ffffff" />
                                <Text style={styles.downloadButtonText}>Download CSV</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#ffffff',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    exportButton: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#3b82f6',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    exportButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 13 },

    card: {
        backgroundColor: '#ffffff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    ticketNo: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
    statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    circuitDesc: { fontSize: 13, color: '#475569', marginBottom: 6 },
    rcaPreview: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 6 },
    noRca: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', marginBottom: 6 },
    resolvedDate: { fontSize: 11, color: '#94a3b8' },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },

    paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
    pageButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    pageButtonDisabled: { opacity: 0.5 },
    pageLabel: { fontSize: 13, color: '#475569' },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    modalLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 12 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    chipText: { fontSize: 12, color: '#475569' },
    chipTextActive: { color: '#ffffff', fontWeight: '600' },
    downloadButton: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#16a34a',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    downloadButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});