import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCustomers } from '../../../src/hooks/useCustomers';
import { useAuthStore } from '../../../src/store/authStore';

export default function CustomerManagement() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = useCustomers({ page, limit: 10, search });
  const customers = (data?.customers || []).filter(Boolean);
  const pagination = data?.pagination;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className='bg-white p-5'></View>
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search customers..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push('/(admin)/customers/create')}>
          <Feather name="plus" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item, index) => String(item?.customer_row_id ?? item?.customer_id ?? index)}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/(admin)/customers/${item.customer_row_id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <View style={{ gap: 5 }}>
                {item.outstanding !== null && item.outstanding !== undefined && user.email !== "abhishek@fab5network.com" && (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: item.outstanding > 0 ? '#dc2626' : '#16a34a', marginRight: 8 }}>
                    ₹{item.outstanding}
                  </Text>
                )}
                <Text style={styles.customerId}>{item.customer_id}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No customers found.</Text>
          }
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
                <Text style={styles.pageLabel}>
                  Page {pagination.currentPage} of {pagination.pages}
                </Text>
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
  header: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#ffffff' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  name: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  customerId: { fontSize: 11, color: '#94a3b8' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16 },
  pageButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  pageButtonDisabled: { opacity: 0.5 },
  pageLabel: { fontSize: 13, color: '#475569' },
});