// app/(agent)/tickets/index.js
import { Stack } from 'expo-router';
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function AgentTicketList() {
  return(<>
  <Stack.Screen options={{ headerShown: false }} />
  <TicketListScreen basePath="/(agent)/tickets" />;
  </>) 
}