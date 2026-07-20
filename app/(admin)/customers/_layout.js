// app/(admin)/customers/_layout.js
import { Stack } from 'expo-router';

export default function CustomersStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}