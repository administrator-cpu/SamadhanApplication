// app/(customer)/tickets/_layout.js
// Nested Stack inside the "My Tickets" tab so list → detail navigation
// works without leaving the tab bar.
import { Stack } from 'expo-router';

export default function CustomerTicketsStack() {
  return <Stack screenOptions={{ headerShown: true }} />;
}