// app/(admin)/staff/create.js
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCreateEmployee } from '../../../src/hooks/useCustomers';
import { useCategories } from '../../../src/hooks/useTickets';

const ROLES = [
  { value: 'SUPPORT_AGENT', label: 'Support Agent' },
  { value: 'ADMIN', label: 'Admin' },
];

export default function CreateStaff() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('SUPPORT_AGENT');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const { mutate, isPending, error } = useCreateEmployee();
  const { data: categories } = useCategories();

  const toggleCategory = (name) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      Alert.alert('Invalid name', 'Name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    mutate(
      {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        role,
        issueCategories: role === 'SUPPORT_AGENT' ? selectedCategories : undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Staff account created. A welcome email has been sent.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {error ? <Text style={styles.errorText}>{error.message || 'Failed to create staff account.'}</Text> : null}

      <Text style={styles.label}>Full Name *</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Agent Smith" style={styles.input} />

      <Text style={styles.label}>Email *</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="agent@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" style={styles.input} />

      <Text style={styles.label}>Role *</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <Pressable
            key={r.value}
            onPress={() => setRole(r.value)}
            style={[styles.roleChip, role === r.value && styles.roleChipActive]}
          >
            <Text style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {role === 'SUPPORT_AGENT' && (
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
                  {isSelected && <Feather name="check" size={12} color="#ffffff" style={{ marginRight: 4 }} />}
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Pressable onPress={handleSubmit} disabled={isPending} style={styles.submitButton}>
        {isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Create Account</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  roleChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  roleChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  roleChipTextActive: { color: '#ffffff' },
  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  categoryChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryChipText: { fontSize: 12, color: '#475569' },
  categoryChipTextActive: { color: '#ffffff', fontWeight: '600' },
  submitButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  submitText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});