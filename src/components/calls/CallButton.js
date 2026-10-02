// src/components/calls/CallButton.js
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Phone } from 'lucide-react-native';
import { useCallContext } from '@/context/CallProvider';

export default function CallButton({ toEmail, ticketId }) {
  const call = useCallContext();

  return (
    <TouchableOpacity
      onPress={() => call.startCall({ toEmail, ticketId })}
      activeOpacity={0.8}
      className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm mr-2"
    >
      <Phone size={19} color="#B8300F" />
    </TouchableOpacity>
  );
}