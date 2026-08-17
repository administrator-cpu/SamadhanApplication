// app/(sales)/tickets/index.js
import { Stack } from 'expo-router';
import TicketListScreen from '../../../src/components/TicketListScreen';

export default function SalesTicketList() {
  return <>
    <Stack.Screen options={{ headerShown: false }} />

    <TicketListScreen basePath="/(sales)/tickets" ownership={undefined} />

  </>

}