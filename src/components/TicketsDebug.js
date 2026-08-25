// src/components/TicketsDebug.js
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ticketService } from '../api/ticketService';

export default function TicketsDebug() {
  const [raw, setRaw] = useState(null);
  const [err, setErr] = useState(null);

useEffect(() => {
  ticketService
    .getTickets({ limit: 5, sortField: 'updated_at', sortOrder: 'desc' })
    .then((res) => console.log('SORTED /tickets RESPONSE', JSON.stringify(res.tickets?.map(t => ({ id: t.id, updated_at: t.updated_at })), null, 2)))
    .catch((e) => console.log('SORTED /tickets ERROR', e?.response?.data || e?.message));
}, []);

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="font-sans-semibold text-base mb-2">Raw /tickets response</Text>
      {err && <Text className="text-red-600 font-mono text-xs">{JSON.stringify(err, null, 2)}</Text>}
      {raw && <Text className="font-mono text-xs">{JSON.stringify(raw, null, 2)}</Text>}
    </ScrollView>
  );
}