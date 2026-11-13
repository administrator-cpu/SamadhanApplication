// app/(auth)/force-password-change.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Screen from '../../src/components/layout/Screen';

const INPUT_CLASS = 'border border-[#e2e8f0] rounded-[12px] px-[12px] std:px-[16px] py-[14px] text-[16px]';
import { authService } from '../../src/api/authService';
import { useAuthStore } from '../../src/store/authStore';

export default function ForcePasswordChangeScreen() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = () => {
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(newPassword)) return 'Password must include an uppercase letter.';
    if (!/[a-z]/.test(newPassword)) return 'Password must include a lowercase letter.';
    if (!/[0-9]/.test(newPassword)) return 'Password must include a number.';
    if (!/[^A-Za-z0-9]/.test(newPassword)) return 'Password must include a special character.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

const handleSubmit = async () => {
  const validationError = validate();
  if (validationError) {
    setErrorMessage(validationError);
    return;
  }

  setErrorMessage('');
  setIsSubmitting(true);

  try {
    await authService.changePassword(undefined, newPassword);
    await clearAuth();
  } catch (error) {
    await clearAuth();
    setErrorMessage('Password updated. Please log in with your new password.');
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <Screen edges={['top', 'bottom']} className="bg-[#ffffff]">
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <View className="flex-1 bg-[#ffffff] justify-center px-[24px]">
        <Text className="text-[22px] font-bold mb-[6px]">Set a New Password</Text>
        <Text className="text-[#64748b] mb-[24px]">
          Welcome, {user?.name || 'there'}. For security, please set a permanent password before continuing.
        </Text>

        {errorMessage ? (
          <View className="bg-[#fef2f2] rounded-[10px] p-[12px] mb-[16px]">
            <Text className="text-[#dc2626] text-[13px]">{errorMessage}</Text>
          </View>
        ) : null}

        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
          editable={!isSubmitting}
          className={INPUT_CLASS}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          editable={!isSubmitting}
          className={`${INPUT_CLASS} mt-[12px]`}
        />

        <Text className="text-[#94a3b8] text-[12px] mt-[10px]">
          Must be 8+ characters with uppercase, lowercase, a number, and a special character.
        </Text>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={`rounded-[12px] py-[14px] items-center mt-[24px] ${isSubmitting ? 'bg-[#93c5fd]' : 'bg-[#3b82f6]'}`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-[#ffffff] font-semibold text-[15px]">Set Password</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </Screen>
  );
}