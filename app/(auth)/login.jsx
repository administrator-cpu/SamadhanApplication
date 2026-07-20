import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { router } from 'expo-router'; // Fixed missing import
import { Feather } from '@expo/vector-icons'; // Added for password toggle
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/api/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // New state for UX
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
      // Root _layout.js guard handles redirection
    } catch (error) {
      setErrorMessage(error?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      className="flex-1 bg-slate-50" // Softened background for eye comfort
    >
      <View className="flex-1 justify-center px-6">
        <Text 
          accessibilityRole="header"
          className="text-3xl font-bold text-slate-900 mb-2"
        >
          Welcome back
        </Text>
        <Text className="text-base text-slate-500 mb-8">
          Sign in to your Samadhan account
        </Text>

        {/* Error Banner with Accessibility Live Region */}
        {errorMessage ? (
          <View 
            accessibilityLiveRegion="polite"
            className="flex-row items-center bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6"
          >
            <Feather name="alert-circle" size={18} color="#b91c1c" />
            <Text className="text-red-700 text-sm ml-2 flex-1 font-medium">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Email Input */}
        <Text className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!isSubmitting}
          accessibilityLabel="Email address input"
          className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-5 text-base text-slate-900"
        />

        {/* Password Input with Toggle */}
        <Text className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          Password
        </Text>
        <View className="bg-white border border-slate-200 rounded-xl mb-8 flex-row items-center">
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
            textContentType="password"
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            accessibilityLabel="Password input"
            className="flex-1 px-4 py-3.5 text-base text-slate-900"
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            className="p-3 mr-1"
          >
            <Feather 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#64748b" 
            />
          </Pressable>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in button"
          accessibilityState={{ disabled: isSubmitting }}
          className={`rounded-xl py-4 items-center shadow-sm ${
            isSubmitting ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base tracking-wide">
              Sign In
            </Text>
          )}
        </Pressable>

        {/* Forgot Password Link */}
        <View className="mt-6 items-center">
          <Pressable
            disabled={isSubmitting}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Navigate to forgot password screen"
            className="p-2" // Increased touch target size
          >
            <Text className="text-blue-600 font-medium text-sm">
              Forgot your password?
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}