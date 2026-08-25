import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      style={{ flex: 1, backgroundColor: colors.bgBase }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fonts.heading,
            fontSize: 30,
            lineHeight: 38,
            fontWeight: '500',
            color: colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Welcome back
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 16,
            lineHeight: 24,
            color: colors.textSecondary,
            marginBottom: 40,
          }}
        >
          Sign in to your Samadhan account
        </Text>

        {errorMessage ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.errorBg,
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 20,
            }}
          >
            <Feather name="alert-circle" size={18} color={colors.errorText} />
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                color: colors.errorText,
                fontSize: 14,
                marginLeft: 8,
                flex: 1,
              }}
            >
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Email Input */}
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 14,
            color: colors.textPrimary,
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Email
        </Text>
        <View
          style={[
            styles.fieldWrapper,
            focusedField === 'email' && styles.fieldWrapperFocused,
            { marginBottom: 18 },
          ]}
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
            style={{
              paddingHorizontal: 16,
              paddingVertical: 15,
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />
        </View>

        {/* Password Input with Toggle */}
        <Text
          style={{
            fontFamily: fonts.bodySemibold,
            fontSize: 14,
            color: colors.textPrimary,
            marginBottom: 6,
            marginLeft: 4,
          }}
        >
          Password
        </Text>
        <View
          style={[
            styles.fieldWrapper,
            focusedField === 'password' && styles.fieldWrapperFocused,
            { marginBottom: 28, flexDirection: 'row', alignItems: 'center' },
          ]}
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
            style={{
              flex: 1,
              paddingHorizontal: 16,
              paddingVertical: 15,
              fontFamily: fonts.body,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={{ padding: 12, marginRight: 4 }}
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
          style={{
            borderRadius: 10,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isSubmitting ? colors.primary600 : colors.primary500,
            opacity: isSubmitting ? 0.85 : 1,
            shadowColor: '#2E2A24',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 3,
            marginTop: 8,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textOnBrand} />
          ) : (
            <Text
              style={{
                fontFamily: fonts.bodySemibold,
                color: colors.textOnBrand,
                fontSize: 16,
                letterSpacing: 0.3,
              }}
            >
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Pressable
            disabled={isSubmitting}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Navigate to forgot password screen"
            hitSlop={8}
            style={{ padding: 8 }}
          >
            <Text style={{ fontFamily: fonts.bodySemibold, color: colors.primary500, fontSize: 14 }}>
              Forgot your password?
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}