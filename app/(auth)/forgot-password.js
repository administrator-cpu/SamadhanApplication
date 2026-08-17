// app/(auth)/forgot-password.js
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { authService } from '../../src/api/authService';
import * as Clipboard from 'expo-clipboard';

const STEPS = { EMAIL: 'EMAIL', OTP: 'OTP', RESET: 'RESET' };

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.EMAIL);

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Focus tracking purely for visual affordance — no logic impact
  const [focusedField, setFocusedField] = useState(null);

  const clearMessages = () => {
    setErrorMessage('');
    setInfoMessage('');
  };

  // --- Step 1: request OTP ---
  const handleRequestOtp = async () => {
    clearMessages();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setInfoMessage('If this email exists, a 6-digit OTP has been sent.');
      setStep(STEPS.OTP);
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 2: verify OTP ---
  const handleVerifyOtp = async () => {
    clearMessages();
    if (otpCode.trim().length !== 6) {
      setErrorMessage('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.verifyOtp(email.trim().toLowerCase(), otpCode.trim());
      setStep(STEPS.RESET);
    } catch (error) {
      setErrorMessage(error?.message || 'Invalid or expired OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 3: reset password ---
  const validateNewPassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pwd)) return 'Password must include an uppercase letter.';
    if (!/[a-z]/.test(pwd)) return 'Password must include a lowercase letter.';
    if (!/[0-9]/.test(pwd)) return 'Password must include a number.';
    if (!/[^A-Za-z0-9]/.test(pwd)) return 'Password must include a special character.';
    return null;
  };

  const handleResetPassword = async () => {
    clearMessages();
    const pwdError = validateNewPassword(newPassword);
    if (pwdError) {
      setErrorMessage(pwdError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword(email.trim().toLowerCase(), otpCode.trim(), newPassword);
      router.replace('/(auth)/login');
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteOtp = async () => {
    const text = await Clipboard.getStringAsync();
    const digitsOnly = text.replace(/\D/g, '').slice(0, 6);

    if (digitsOnly.length === 6) {
      setOtpCode(digitsOnly);
    } else {
      setErrorMessage('Clipboard doesn\'t contain a valid 6-digit code.');
    }
  };

  // Shared focus-aware wrapper classes for text inputs
  const fieldWrapperClass = (field) =>
    `bg-surface border-[1.5px] rounded-md flex-row items-center ${
      focusedField === field ? 'border-primary-500' : 'border-border'
    }`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      className="flex-1 bg-bg-base"
    >
      <View className="flex-1 justify-center px-6 relative">

        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          className="absolute top-16 left-4 p-3 rounded-full active:bg-bg-subtle z-10"
        >
          <Feather name="arrow-left" size={24} color="#6B6255" />
        </Pressable>

        <View className="mt-12">
          <Text
            accessibilityRole="header"
            className="font-heading text-3xl text-text-primary mb-2"
          >
            {step === STEPS.EMAIL && 'Forgot Password'}
            {step === STEPS.OTP && 'Verify OTP'}
            {step === STEPS.RESET && 'Set New Password'}
          </Text>
          <Text className="font-sans text-base text-text-secondary mb-8 leading-relaxed">
            {step === STEPS.EMAIL && "No worries — enter your account email and we'll send you a reset code."}
            {step === STEPS.OTP && `Enter the 6-digit code sent to ${email}.`}
            {step === STEPS.RESET && 'Choose a strong new password for your account.'}
          </Text>

          {/* Error Banner */}
          {errorMessage ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center bg-error-bg rounded-md px-4 py-3 mb-6"
            >
              <Feather name="alert-circle" size={18} color="#9C4A3C" />
              <Text className="font-sans-semibold text-error-text text-sm ml-2 flex-1">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* Info Banner */}
          {infoMessage ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center bg-info-bg rounded-md px-4 py-3 mb-6"
            >
              <Feather name="info" size={18} color="#4F6B72" />
              <Text className="font-sans-semibold text-info-text text-sm ml-2 flex-1">
                {infoMessage}
              </Text>
            </View>
          ) : null}

          {/* STEP 1: EMAIL */}
          {step === STEPS.EMAIL && (
            <>
              <Text className="font-sans-semibold text-sm text-text-primary mb-1.5 ml-1">
                Email Address
              </Text>
              <View className={`${fieldWrapperClass('email')} mb-6`}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  placeholderTextColor="#9A9184"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!isSubmitting}
                  accessibilityLabel="Email address input"
                  className="flex-1 px-4 py-3.5 font-sans text-base text-text-primary"
                />
              </View>
              <SubmitButton label="Send OTP" onPress={handleRequestOtp} isSubmitting={isSubmitting} />
            </>
          )}

          {/* STEP 2: OTP */}
          {step === STEPS.OTP && (
            <>
              <Text className="font-sans-semibold text-sm text-text-primary mb-1.5 ml-1">
                Verification Code
              </Text>
              <View className={`${fieldWrapperClass('otp')} mb-1`}>
                <TextInput
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="123456"
                  placeholderTextColor="#9A9184"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isSubmitting}
                  accessibilityLabel="OTP input"
                  className="flex-1 py-3.5 pl-4 pr-2 font-mono text-xl text-center tracking-[8px] text-text-primary"
                />
                <Pressable
                  onPress={handlePasteOtp}
                  disabled={isSubmitting}
                  hitSlop={8}
                  className="px-4 py-3.5"
                >
                  <Text className="font-sans-semibold text-primary-500 text-sm">Paste</Text>
                </Pressable>
              </View>

              <View className="mt-6">
                <SubmitButton label="Verify OTP" onPress={handleVerifyOtp} isSubmitting={isSubmitting} />
              </View>

              <Pressable
                onPress={handleRequestOtp}
                disabled={isSubmitting}
                hitSlop={8}
                className="mt-4 items-center py-2"
              >
                <Text className="font-sans-semibold text-primary-500 text-sm">Resend OTP</Text>
              </Pressable>
            </>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === STEPS.RESET && (
            <>
              <Text className="font-sans-semibold text-sm text-text-primary mb-1.5 ml-1">
                New Password
              </Text>
              <View className={`${fieldWrapperClass('newPassword')} mb-4`}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedField('newPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="New password"
                  placeholderTextColor="#9A9184"
                  secureTextEntry={!showNewPassword}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                  accessibilityLabel="New password input"
                  className="flex-1 px-4 py-3.5 font-sans text-base text-text-primary"
                />
                <Pressable
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showNewPassword ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  className="p-3 mr-1"
                >
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#6B6255" />
                </Pressable>
              </View>

              <Text className="font-sans-semibold text-sm text-text-primary mb-1.5 ml-1">
                Confirm Password
              </Text>
              <View className={`${fieldWrapperClass('confirmPassword')} mb-4`}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9A9184"
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                  accessibilityLabel="Confirm password input"
                  className="flex-1 px-4 py-3.5 font-sans text-base text-text-primary"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  hitSlop={8}
                  className="p-3 mr-1"
                >
                  <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#6B6255" />
                </Pressable>
              </View>

              <View className="bg-bg-subtle rounded-sm p-3 mb-6 flex-row">
                <Feather name="shield" size={16} color="#6B6255" style={{ marginTop: 2 }} />
                <Text className="font-sans text-text-secondary text-xs ml-2 flex-1 leading-relaxed">
                  Must be 8+ characters and include uppercase, lowercase, a number, and a special character.
                </Text>
              </View>

              <SubmitButton label="Reset Password" onPress={handleResetPassword} isSubmitting={isSubmitting} />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// Primary action button — TouchableOpacity per Android elevation stability rule
function SubmitButton({ label, onPress, isSubmitting }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isSubmitting}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: isSubmitting }}
      className={`rounded-md py-4 items-center justify-center shadow-lg ${
        isSubmitting ? 'bg-primary-600' : 'bg-primary-500'
      }`}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#FBF9F5" />
      ) : (
        <Text className="font-sans-semibold text-text-on-brand text-base tracking-wide">
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}