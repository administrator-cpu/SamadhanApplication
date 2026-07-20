// app/(admin)/customers/[id].js
import { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCustomers, useUpdateCustomer, useDeleteCustomer } from '../../../../src/hooks/useCustomers';
import ConfirmDialog from '../../../../src/components/ConfirmDialog';

export default function EditCustomer() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation()

  // Same approach as staff edit: no single-customer GET documented,
  // so reuse the list query's cache and find this customer by id.
  const { data } = useCustomers({ page: 1, limit: 100 });
  const customer = (data?.customers || []).find((c) => String(c.customer_row_id) === String(id));


  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { mutate: updateCustomer, isPending: isUpdating, error: updateError } = useUpdateCustomer(id);
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomer();

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
    }
  }, [customer]);

  useLayoutEffect(() => {
    if (customer?.customer_id) {
      navigation.setOptions({ title: customer.customer_id });
    }
  }, [customer?.customer_id]);

  if (!customer) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const handleSave = () => {
    updateCustomer(
      { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Customer details updated successfully.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    deleteCustomer(id, {
      onSuccess: () => router.back(),
      onError: (err) => Alert.alert('Error', err.message || 'Failed to delete customer.'),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* <Stack.Screen options={{ headerShown: false }} /> */}
      {updateError ? (
        <Text style={styles.errorText}>{updateError.message || 'Failed to save changes.'}</Text>
      ) : null}

      {/* <View style={styles.idBadge}>
        <Feather name="hash" size={14} color="#64748b" />
        <Text style={styles.idText}>{customer.customer_id}</Text>
      </View> */}

      {customer.outstanding !== null && customer.outstanding !== undefined && (
        <View style={[styles.outstandingCard, { backgroundColor: customer.outstanding > 0 ? '#fef2f2' : '#f0fdf4' }]}>
          <Feather name="credit-card" size={16} color={customer.outstanding > 0 ? '#dc2626' : '#16a34a'} />
          <Text style={{ color: customer.outstanding > 0 ? '#dc2626' : '#16a34a', fontWeight: '600', fontSize: 13 }}>
            Outstanding Balance: ₹{customer.outstanding}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Full Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

      <Pressable
        style={styles.connectionsButton}
        onPress={() => router.push(`/(admin)/customers/${customer.customer_row_id}/connections`)}
      >
        <Feather name="wifi" size={16} color="#2563eb" />
        <Text style={styles.connectionsText}>View CRM Connections</Text>
        <Feather name="chevron-right" size={16} color="#94a3b8" />
      </Pressable>

      <Pressable onPress={handleSave} disabled={isUpdating} style={styles.saveButton}>
        {isUpdating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save Changes</Text>}
      </Pressable>

      <Pressable onPress={() => setDeleteDialogOpen(true)} disabled={isDeleting} style={styles.deleteButton}>
        {isDeleting ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <>
            <Feather name="trash-2" size={16} color="#dc2626" />
            <Text style={styles.deleteText}>Delete Customer</Text>
          </>
        )}
      </Pressable>

      <ConfirmDialog
        visible={deleteDialogOpen}
        title="Delete Customer"
        message={`This will permanently delete ${customer.name}'s account and all associated data. This cannot be undone.`}
        icon="trash-2"
        accentColor="#dc2626"
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  idBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  idText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  outstandingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15 },
  connectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
  },
  connectionsText: { flex: 1, fontSize: 14, color: '#2563eb', fontWeight: '600' },
  saveButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  deleteButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
  },
  deleteText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
});