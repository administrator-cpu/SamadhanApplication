// src/components/calls/IncomingCallModal.js
import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Phone, PhoneOff } from 'lucide-react-native';

export default function IncomingCallModal({ callerName, onAccept, onReject }) {
  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-sm items-center rounded-lg bg-surface p-6 shadow-lg">
          <Text className="mb-1 font-sans text-sm text-text-tertiary">Incoming call</Text>
          <Text className="mb-6 font-heading text-2xl text-text-primary">{callerName}</Text>

          <View className="flex-row items-center justify-center gap-6">
            <TouchableOpacity
              onPress={onReject}
              activeOpacity={0.8}
              className="h-14 w-14 items-center justify-center rounded-full bg-error-bg"
            >
              <PhoneOff size={24} color="#E0311F" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAccept}
              activeOpacity={0.8}
              className="h-14 w-14 items-center justify-center rounded-full bg-success-bg"
            >
              <Phone size={24} color="#0F9D58" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}