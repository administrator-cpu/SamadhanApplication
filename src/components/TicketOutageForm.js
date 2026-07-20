// src/components/TicketOutageForm.js
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useUpdateOutage } from '../hooks/useTickets';

export default function TicketOutageForm({ ticket, onDone }) {
  const [problemSide, setProblemSide] = useState(ticket?.problem_side || '');
  const [telcoSrNumber, setTelcoSrNumber] = useState(ticket?.telco_sr_number || '');
  const { mutate, isPending } = useUpdateOutage(ticket?.id);

  const handleSave = () => {
    mutate(
      { problemSide: problemSide.trim(), externalTicketNo: telcoSrNumber.trim() },
      { onSuccess: () => onDone?.() }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Problem Side / Provider</Text>
      <TextInput
        value={problemSide}
        onChangeText={setProblemSide}
        placeholder="e.g. Airtel"
        placeholderTextColor="#9ca3af"
        style={styles.input}
      />

      <Text style={styles.label}>Telco SR Number</Text>
      <TextInput
        value={telcoSrNumber}
        onChangeText={setTelcoSrNumber}
        placeholder="e.g. TT-128492"
        placeholderTextColor="#9ca3af"
        style={styles.input}
      />

      <Pressable onPress={handleSave} disabled={isPending} style={styles.saveButton}>
        {isPending ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Feather name="check" size={15} color="#ffffff" />
            <Text style={styles.saveText}>Save Outage Details</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  saveButton: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});