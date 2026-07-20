// app/(customer)/tickets/index.js
import { Stack } from 'expo-router';
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function CustomerTicketList() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TicketListScreen basePath="/(customer)/tickets" />
    </>
  );
}