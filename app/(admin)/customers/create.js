// app/(admin)/customers/create.js
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateCustomer } from '../../../src/hooks/useCustomers';

export default function CreateCustomer() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { mutate, isPending, error } = useCreateCustomer();

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
      { name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Customer account created. A welcome email has been sent.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorText}>{error.message || 'Failed to create customer.'}</Text> : null}

      <Text style={styles.label}>Full Name *</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Acme Corp" style={styles.input} />

      <Text style={styles.label}>Email *</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="contact@acme.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="9876543210"
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Pressable onPress={handleSubmit} disabled={isPending} style={styles.submitButton}>
        {isPending ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Create Account</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 20 },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15 },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  submitText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
});