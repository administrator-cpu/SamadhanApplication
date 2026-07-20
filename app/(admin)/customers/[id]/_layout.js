// app/(admin)/customers/[id]/_layout.js
import { Stack } from 'expo-router';

export default function CustomerDetailStack() {
  return <Stack screenOptions={{ headerShown: true }} />;
}