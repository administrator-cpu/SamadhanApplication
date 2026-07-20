// src/components/TicketRating.js
import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useRateTicket } from '../hooks/useTickets';

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
      { onSuccess: () => setSubmitted(true) }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{submitted ? 'Your Rating' : 'Rate This Ticket'}</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => {
              setRating(star);
              setSubmitted(false); // allow editing an existing rating
            }}
            hitSlop={6}
          >
            <Feather
              name="star"
              size={30}
              color={star <= rating ? '#f59e0b' : '#e2e8f0'}
              style={star <= rating ? styles.starFilled : undefined}
            />
          </Pressable>
        ))}
      </View>

      <TextInput
        value={feedback}
        onChangeText={(text) => {
          setFeedback(text);
          setSubmitted(false);
        }}
        placeholder="Optional feedback..."
        placeholderTextColor="#9ca3af"
        multiline
        style={styles.input}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={rating < 1 || isPending}
        style={[styles.submitButton, (rating < 1 || isPending) && styles.submitDisabled]}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>{submitted ? 'Update Feedback' : 'Submit Rating'}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  starFilled: {},
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});