// app/(admin)/staff/index.js
import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEmployees } from '../../../src/hooks/useCustomers';

const ROLE_COLORS = {
  ADMIN: { bg: '#faf5ff', text: '#7c3aed' },
  SUPPORT_AGENT: { bg: '#eff6ff', text: '#2563eb' },
  SALES: { bg: '#f0fdf4', text: '#16a34a' },
};

export default function StaffManagement() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEmployees({ page, limit: 10 });

  const employees = (data?.employees || []).filter(Boolean);
  const pagination = data?.pagination;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/(admin)/staff/create')}>
          <Feather name="plus" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item, index) => String(item?.employee_row_id ?? item?.employee_id ?? index)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const roleColors = ROLE_COLORS[item.role] || ROLE_COLORS.SUPPORT_AGENT;
            return (
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/(admin)/staff/${item.employee_row_id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
                    {item.role?.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#cbd5e1" style={{ marginLeft: 8 }} />
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No staff members found.</Text>}
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
    </View>
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
  addButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2563eb', fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  roleBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  pageButtonDisabled: { opacity: 0.5 },
  pageLabel: { fontSize: 13, color: '#475569' },
});