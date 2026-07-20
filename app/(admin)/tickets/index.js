// app/(admin)/tickets/index.js
import { Stack } from 'expo-router';
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function AdminTicketList() {
  return (<>
    <Stack.Screen options={{ headerShown: false }} />
    <TicketListScreen basePath="/(admin)/tickets" />;
  </>)
}