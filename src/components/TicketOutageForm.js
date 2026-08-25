// src/components/TicketOutageForm.js
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUpdateOutage } from '../hooks/useTickets';
import { haptics } from '../utils/haptics';
import { FORM, T } from './ticketTheme';

// Common upstream providers — tapping one fills the field, typing still works.
const SUGGESTIONS = ['Airtel', 'Bharti', 'Extreme IX', 'Jio', 'Tata', 'Local loop'];

export default function TicketOutageForm({ ticket, onDone }) {
  const [problemSide, setProblemSide] = useState(ticket?.problem_side || '');
  const [telcoSrNumber, setTelcoSrNumber] = useState(ticket?.telco_sr_number || '');
  const { mutate, isPending } = useUpdateOutage(ticket?.id);

  const handleSave = () => {
    mutate(
      { problemSide: problemSide.trim(), externalTicketNo: telcoSrNumber.trim() },
      {
        onSuccess: () => {
          haptics.success();
          onDone?.();
        },
        onError: () => haptics.error(),
      }
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 34 }}>
      <View style={styles.intro}>
        <View style={styles.introChip}>
          <Feather name="wifi-off" size={16} color={T.amber} />
        </View>
        <Text style={styles.introText}>
          Record who owns the fault upstream, so the next agent doesn't chase it twice.
        </Text>
      </View>

      <Text style={[FORM.label, { marginTop: 20 }]}>Where the fault sits</Text>
      <TextInput
        value={problemSide}
        onChangeText={setProblemSide}
        placeholder="e.g. Airtel"
        placeholderTextColor={T.hint}
        style={FORM.input}
      />
      <View style={styles.suggestRow}>
        {SUGGESTIONS.map((name) => {
          const active = problemSide.trim().toLowerCase() === name.toLowerCase();
          return (
            <Pressable
              key={name}
              onPress={() => setProblemSide(name)}
              style={[styles.suggestChip, active && styles.suggestChipActive]}
            >
              <Text style={[styles.suggestText, active && styles.suggestTextActive]}>{name}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[FORM.label, { marginTop: 20 }]}>Their ticket number</Text>
      <TextInput
        value={telcoSrNumber}
        onChangeText={setTelcoSrNumber}
        placeholder="e.g. TT-128492"
        placeholderTextColor={T.hint}
        autoCapitalize="characters"
        style={FORM.input}
      />
      <Text style={styles.hint}>Leave blank if the provider hasn't given one yet.</Text>

      <Pressable onPress={handleSave} disabled={isPending} style={[FORM.primary, { marginTop: 24 }, isPending && FORM.disabled]}>
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="check" size={16} color="#FFFFFF" />
            <Text style={FORM.primaryText}>Save outage details</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.field, borderRadius: 18, padding: 14 },
  introChip: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: T.body },

  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestChip: { height: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: T.field },
  suggestChipActive: { backgroundColor: T.blueTint },
  suggestText: { fontSize: 12.5, fontWeight: '600', color: T.muted },
  suggestTextActive: { color: T.blueInk },

  hint: { fontSize: 11.5, color: T.soft, marginTop: 8, marginLeft: 4 },
});
