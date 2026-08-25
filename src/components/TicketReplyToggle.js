// src/components/TicketReplyToggle.js
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useUpdateReplyStatus } from '../hooks/useTickets';

const ELIGIBLE_STATUSES = ['IN_PROGRESS', 'ESCALATED'];

export default function TicketReplyToggle({ ticket }) {
  const [error, setError] = useState(null);
  const { mutate, isPending } = useUpdateReplyStatus(ticket?.id);

  if (!ticket || !ELIGIBLE_STATUSES.includes(ticket.status)) return null;

  const allowed = ticket.allow_customer_reply !== false;

  const handleToggle = () => {
    setError(null);
    mutate(!allowed, { onError: () => setError('Could not update reply status') });
  };

  return (
    <View className="flex-row items-center gap-3 min-h-[64px] px-3.5 py-3 rounded-[20px] bg-orange-50/70">
      <View className="w-[40px] h-[40px] rounded-[14px] bg-white items-center justify-center">
        <Feather name={allowed ? 'unlock' : 'lock'} size={18} color="#B45309" />
      </View>

      <View className="flex-1">
        <Text className="text-[14.5px] font-semibold text-stone-800">Customer reply</Text>
        <Text className="text-[11.5px] text-stone-500 mt-0.5">
          {isPending ? 'Updating…' : allowed ? 'Customer can reply on this ticket' : 'Customer replies are turned off'}
        </Text>
        {error ? <Text className="text-[11px] text-rose-600 mt-0.5">{error}</Text> : null}
      </View>

      {isPending ? (
        <ActivityIndicator size="small" color="#B45309" />
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleToggle}
          className={`h-8 px-4 rounded-full items-center justify-center ${allowed ? 'bg-amber-700' : 'bg-stone-200'}`}
        >
          <Text className={`text-[12px] font-semibold ${allowed ? 'text-white' : 'text-stone-600'}`}>
            {allowed ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}