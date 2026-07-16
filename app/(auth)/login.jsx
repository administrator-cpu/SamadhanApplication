import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/api/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const login = useAuthStore((state) => state.login);

  const validate = () => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
    if (!password) return 'Password is required.';
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
      const { user, accessToken, refreshToken } = await authService.login(
        email.trim().toLowerCase(),
        password
      );

      await login(user, accessToken, refreshToken);
      // No manual navigation here — the root _layout.js guard sees
      // isAuthenticated flip to true and redirects to (tabs) itself.

    } catch (error) {
      // authService -> apiClient's interceptor normalizes errors to
      // { status, message, data }, so error.message is always safe to show.
      setErrorMessage(error?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold mb-1">Welcome back</Text>
        <Text className="text-gray-500 mb-8">Sign in to Samadhan</Text>

        {errorMessage ? (
          <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <Text className="text-red-700 text-sm">{errorMessage}</Text>
          </View>
        ) : null}

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isSubmitting}
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          textContentType="password"
          editable={!isSubmitting}
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className={`rounded-lg py-3.5 items-center ${isSubmitting ? 'bg-blue-300' : 'bg-blue-600'}`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </Pressable>

        <Pressable className="mt-4 items-center" disabled={isSubmitting}>
          <Text className="text-blue-600 text-sm">Forgot password?</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}