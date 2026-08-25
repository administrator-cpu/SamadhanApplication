// src/components/TicketRating.js
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRateTicket } from '../hooks/useTickets';
import { useAuthStore } from '../store/authStore';
import { haptics } from '../utils/haptics';
import { CARD_SHADOW, T } from './ticketTheme';

const FACES = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

export default function TicketRating({ ticket }) {
  const user = useAuthStore((state) => state.user);
  const isCustomer = user?.role === 'USER';
  const { mutate, isPending } = useRateTicket(ticket?.id);

  const canRate = isCustomer && (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED');

  const [rating, setRating] = useState(ticket?.rating || 0);
  const [feedback, setFeedback] = useState(ticket?.rating_feedback || '');
  const [submitted, setSubmitted] = useState(!!ticket?.rating);

  useEffect(() => {
    setRating(ticket?.rating || 0);
    setFeedback(ticket?.rating_feedback || '');
    setSubmitted(!!ticket?.rating);
  }, [ticket?.rating, ticket?.rating_feedback]);

  if (!canRate) return null;

  const handleSubmit = () => {
    if (rating < 1) return;
    mutate(
      { rating, feedback: feedback.trim() || undefined },
      {
        onSuccess: () => {
          haptics.success();
          setSubmitted(true);
        },
        onError: () => haptics.error(),
      }
    );
  };

  const activeLabel = FACES.find((f) => f.value === rating)?.label;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{submitted ? 'Thanks for the feedback' : 'How did we do?'}</Text>
      <Text style={styles.subtitle}>
        {submitted ? 'You can change this any time.' : 'One tap is enough — a note is optional.'}
      </Text>

      <View style={styles.starsRow}>
        {FACES.map((face) => {
          const filled = face.value <= rating;
          return (
            <Pressable
              key={face.value}
              onPress={() => {
                setRating(face.value);
                setSubmitted(false); // allow editing an existing rating
              }}
              hitSlop={8}
              style={[styles.starTap, filled ? styles.starTapActive : null]}
            >
              <Feather name="star" size={24} color={filled ? T.amber : '#D7DEE9'} />
            </Pressable>
          );
        })}
      </View>

      {activeLabel ? <Text style={styles.ratingLabel}>{activeLabel}</Text> : null}

      <TextInput
        value={feedback}
        onChangeText={(text) => {
          setFeedback(text);
          setSubmitted(false);
        }}
        placeholder="Anything you'd like to add? (optional)"
        placeholderTextColor={T.hint}
        multiline
        style={styles.input}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={rating < 1 || isPending}
        style={[styles.submit, (rating < 1 || isPending) && styles.submitDisabled]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>{submitted ? 'Update feedback' : 'Send feedback'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 22,
    padding: 19,
    marginTop: 14,
    marginBottom: 4,
    ...CARD_SHADOW,
  },
  title: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.3, color: T.ink, textAlign: 'center' },
  subtitle: { fontSize: 12, color: T.muted, textAlign: 'center', marginTop: 4 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  starTap: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  starTapActive: { backgroundColor: T.amberTint },
  ratingLabel: { fontSize: 12.5, fontWeight: '700', color: T.amberInk, textAlign: 'center', marginTop: 8 },
  input: {
    backgroundColor: T.field,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    color: T.ink,
    minHeight: 72,
    textAlignVertical: 'top',
    marginTop: 14,
  },
  submit: {
    backgroundColor: T.ink,
    borderRadius: 999,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF' },
});
