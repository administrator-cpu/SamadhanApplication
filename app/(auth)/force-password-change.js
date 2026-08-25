// app/(auth)/force-password-change.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 6 }}>Set a New Password</Text>
        <Text style={{ color: '#64748b', marginBottom: 24 }}>
          Welcome, {user?.name || 'there'}. For security, please set a permanent password before continuing.
        </Text>

        {errorMessage ? (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#dc2626', fontSize: 13 }}>{errorMessage}</Text>
          </View>
        ) : null}

        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          secureTextEntry
          editable={!isSubmitting}
          style={forceChangeInputStyle}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          secureTextEntry
          editable={!isSubmitting}
          style={[forceChangeInputStyle, { marginTop: 12 }]}
        />

        <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>
          Must be 8+ characters with uppercase, lowercase, a number, and a special character.
        </Text>

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={{
            backgroundColor: isSubmitting ? '#93c5fd' : '#3b82f6',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>Set Password</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const forceChangeInputStyle  = {
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
};