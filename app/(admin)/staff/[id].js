// app/(admin)/staff/[id].js
import { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEmployees, useUpdateEmployee, useDeleteEmployee } from '../../../src/hooks/useCustomers';
import { useCategories } from '../../../src/hooks/useTickets';
import ConfirmDialog from '../../../src/components/ConfirmDialog';

export default function EditStaff() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation()

  const { data } = useEmployees({ page: 1, limit: 100 });
  const employee = (data?.employees || []).find((e) => String(e.employee_row_id) === String(id));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: categories } = useCategories();
  const { mutate: updateEmployee, isPending: isUpdating, error: updateError } = useUpdateEmployee(id);
  const { mutate: deleteEmployee, isPending: isDeleting } = useDeleteEmployee();

useEffect(() => {
  if (employee) {
    setName(employee.name || '');
    setEmail(employee.email || '');
    setPhone(employee.phone || '');
    setSelectedCategories((employee.categories || []).map((c) => c.name));
  }
}, [employee]);

    useLayoutEffect(() => {
    if (employee?.name) {
      navigation.setOptions({ title: employee?.name});
    }
  }, [employee?.name]);

  if (!employee) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const toggleCategory = (name) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleSave = () => {
    updateEmployee(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        issueCategories: employee.role === 'SUPPORT_AGENT' ? selectedCategories : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Staff details updated successfully.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    deleteEmployee(id, {
      onSuccess: () => router.back(),
      onError: (err) => Alert.alert('Error', err.message || 'Failed to delete staff member.'),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {updateError ? (
        <Text style={styles.errorText}>{updateError.message || 'Failed to save changes.'}</Text>
      ) : null}

      <Text style={styles.label}>Full Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />

      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />

      {employee.role === 'SUPPORT_AGENT' && (
        <>
          <Text style={styles.label}>Issue Specialties</Text>
          <View style={styles.categoriesWrap}>
            {(categories || []).map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.name)}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Pressable onPress={handleSave} disabled={isUpdating} style={styles.saveButton}>
        {isUpdating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save Changes</Text>}
      </Pressable>

      <Pressable
        onPress={() => setDeleteDialogOpen(true)}
        disabled={isDeleting}
        style={styles.deleteButton}
      >
        {isDeleting ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <>
            <Feather name="trash-2" size={16} color="#dc2626" />
            <Text style={styles.deleteText}>Delete Staff Member</Text>
          </>
        )}
      </Pressable>

      <ConfirmDialog
        visible={deleteDialogOpen}
        title="Delete Staff Member"
        message={`This will permanently delete ${employee.name}'s account. This cannot be undone.`}
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
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15 },
  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  categoryChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryChipText: { fontSize: 12, color: '#475569' },
  categoryChipTextActive: { color: '#ffffff', fontWeight: '600' },
  saveButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
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