// src/components/calls/InCallScreen.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Mic, MicOff, PhoneOff } from 'lucide-react-native';
import { CALL_STATUS } from '@/hooks/useCall';

const STATUS_LABEL = {
  [CALL_STATUS.RINGING_OUTGOING]: 'Ringing…',
  [CALL_STATUS.CONNECTING]: 'Connecting…',
  [CALL_STATUS.CONNECTED]: 'Connected',
};

export default function InCallScreen({ call }) {
  const isOutgoingRinging = call.status === CALL_STATUS.RINGING_OUTGOING;
  const displayName = call.incomingCall?.callerName ?? 'Calling…';

  return (
    <Modal animationType="slide" visible statusBarTranslucent>
      <View className="flex-1 items-center justify-between bg-bg-base px-6 py-12">
        <View className="mt-16 items-center">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-primary-100">
            <Text className="font-heading text-3xl text-primary-700">
              {displayName?.[0]?.toUpperCase() ?? '•'}
            </Text>
          </View>
          <Text className="mb-2 font-heading text-xl text-text-primary">{displayName}</Text>
          <Text className="font-sans-medium text-base text-text-secondary">
            {STATUS_LABEL[call.status]}
          </Text>
        </View>

        <View className="flex-row items-center justify-center gap-6">
          <TouchableOpacity
            onPress={call.toggleMute}
            activeOpacity={0.8}
            className={`h-14 w-14 items-center justify-center rounded-full ${
              call.isMuted ? 'bg-primary-100' : 'bg-surface-sunken'
            }`}
          >
            {call.isMuted ? (
              <MicOff size={22} color="#B8300F" />
            ) : (
              <Mic size={22} color="#241F1A" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isOutgoingRinging ? call.cancelOutgoing : call.endCall}
            activeOpacity={0.8}
            className="h-16 w-16 items-center justify-center rounded-full bg-error-text"
          >
            <PhoneOff size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}