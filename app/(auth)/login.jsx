import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Screen from '../../src/components/layout/Screen';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/api/authService';

const colors = {
  bgBase: '#F7F4EF',
  surface: '#FFFFFE',
  border: '#E4DDD1',
  borderStrong: '#D3C9B8',
  textPrimary: '#2E2A24',
  textSecondary: '#6B6255',
  textTertiary: '#9A9184',
  textOnBrand: '#FBF9F5',
  primary50: '#FBEEE3',
  primary200: '#EAC49B',
  primary500: '#C0703A',
  primary600: '#9C5A2C',
  primary700: '#764222',
  errorBg: '#F5E7E3',
  errorText: '#9C4A3C',
};

const fonts = {
  heading: 'Fraunces_500Medium',
  body: 'Karla_400Regular',
  bodySemibold: 'Karla_600SemiBold',
};

const styles = StyleSheet.create({
  fieldWrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    shadowColor: colors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  fieldWrapperFocused: {
    borderColor: colors.primary500,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);

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
    } catch (error) {
      setErrorMessage(error?.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stable handler identities — avoids recreating closures every render.
  const handleEmailFocus = useCallback(() => setFocusedField('email'), []);
  const handlePasswordFocus = useCallback(() => setFocusedField('password'), []);
  const handleBlur = useCallback(() => setFocusedField(null), []);

  return (
    <Screen edges={['top', 'bottom']} className="bg-[#F7F4EF]">
    <KeyboardAvoidingView behavior="padding" className="flex-1">
      <View className="flex-1 justify-center px-[24px]">
        <Text
          accessibilityRole="header"
          className="font-[Fraunces_500Medium] text-[30px] leading-[38px] font-medium text-[#2E2A24] mb-[8px]"
        >
          Welcome back
        </Text>
        <Text
          className="font-[Karla_400Regular] text-[16px] leading-[24px] text-[#6B6255] mb-[40px]"
        >
          Sign in to your Samadhan account
        </Text>

        {errorMessage ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center bg-[#F5E7E3] rounded-[10px] px-[12px] std:px-[16px] py-[12px] mb-[20px]"
          >
            <Feather name="alert-circle" size={18} color={colors.errorText} />
            <Text
              className="font-[Karla_600SemiBold] text-[#9C4A3C] text-[14px] ml-[8px] flex-1"
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Email Input */}
        <Text
          className="font-[Karla_600SemiBold] text-[14px] text-[#2E2A24] mb-[6px] ml-[4px]"
        >
          Email
        </Text>
        <View
          className="mb-[18px]"
          style={[styles.fieldWrapper, focusedField === 'email' && styles.fieldWrapperFocused]}
        >
          <TextInput
            value={email}
            onChangeText={setEmail}
            onFocus={handleEmailFocus}
            onBlur={handleBlur}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!isSubmitting}
            accessibilityLabel="Email address input"
            className="px-[12px] std:px-[16px] py-[15px] font-[Karla_400Regular] text-[16px] text-[#2E2A24]"
          />
        </View>

        {/* Password Input with Toggle */}
        <Text
          className="font-[Karla_600SemiBold] text-[14px] text-[#2E2A24] mb-[6px] ml-[4px]"
        >
          Password
        </Text>
        <View
          className="mb-[28px] flex-row items-center"
          style={[styles.fieldWrapper, focusedField === 'password' && styles.fieldWrapperFocused]}
        >
          <TextInput
            value={password}
            onChangeText={setPassword}
            onFocus={handlePasswordFocus}
            onBlur={handleBlur}
            placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={!showPassword}
            textContentType="password"
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
            blurOnSubmit={false}
            accessibilityLabel="Password input"
            className="flex-1 px-[12px] std:px-[16px] py-[15px] font-[Karla_400Regular] text-[16px] text-[#2E2A24]"
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={8}
            className="p-[12px] mr-[4px]"
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in button"
          className={`rounded-[10px] py-[16px] items-center justify-center mt-[8px] ${isSubmitting ? 'bg-[#9C5A2C] opacity-[0.85]' : 'bg-[#C0703A] opacity-100'}`} style={sx.shadow1}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textOnBrand} />
          ) : (
            <Text
              className="font-[Karla_600SemiBold] text-[#FBF9F5] text-[16px] tracking-[0.3px]"
            >
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <View className="mt-[24px] items-center">
          <Pressable
            disabled={isSubmitting}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Navigate to forgot password screen"
            hitSlop={8}
            className="p-[8px]"
          >
            <Text className="font-[Karla_600SemiBold] text-[#C0703A] text-[14px]">
              Forgot your password?
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Screen>
  );
}
const sx = StyleSheet.create({
  shadow1: { shadowColor: '#2E2A24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
});
