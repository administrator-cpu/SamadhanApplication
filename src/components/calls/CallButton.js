// src/components/calls/CallButton.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Phone } from 'lucide-react-native';
import { useCallContext } from '@/context/CallProvider';

export default function CallButton({ toUserId, ticketId }) {
  const call = useCallContext();

  return (
    <TouchableOpacity
      onPress={() => call.startCall({ toUserId, ticketId })}
      activeOpacity={0.8}
      className="h-10 w-10 items-center justify-center rounded-full bg-primary-100"
    >
      <Phone size={18} color="#B8300F" />
    </TouchableOpacity>
  );
}