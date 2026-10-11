// src/components/calls/CallButton.js
import React from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Phone } from 'lucide-react-native';
import { useCallContext } from '@/context/CallProvider';
import { END_REASON } from '@/hooks/useCall';

const MESSAGES = {
  [END_REASON.PERMISSION]: 'Allow microphone access in Settings to make calls.',
  [END_REASON.OFFLINE]: 'You are offline. Check your connection and try again.',
  [END_REASON.NETWORK]: 'Could not start the call. Try again.',
};

export default function CallButton({ toEmail, ticketId }) {
  const call = useCallContext();

  const onPress = async () => {
    try {
      await call.startCall({ toEmail, ticketId });
    } catch (err) {
      Alert.alert('Call failed', MESSAGES[err?.reason] ?? MESSAGES[END_REASON.NETWORK]);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm mr-2"
    >
      <Phone size={19} color="#B8300F" />
    </TouchableOpacity>
  );
}