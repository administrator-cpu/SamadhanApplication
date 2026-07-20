// app/(auth)/forgot-password.js
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      className="flex-1 bg-slate-50"
    >
      <View className="flex-1 justify-center px-6 relative">

        {/* Back Button with larger touch target */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="absolute top-16 left-4 p-3 rounded-full active:bg-slate-200 z-10"
        >
          <Feather name="arrow-left" size={24} color="#334155" />
        </Pressable>

        <View className="mt-12">
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold text-slate-900 mb-2"
          >
            {step === STEPS.EMAIL && 'Forgot Password'}
            {step === STEPS.OTP && 'Verify OTP'}
            {step === STEPS.RESET && 'Set New Password'}
          </Text>
          <Text className="text-base text-slate-500 mb-8">
            {step === STEPS.EMAIL && 'Enter your account email to receive a reset code.'}
            {step === STEPS.OTP && `Enter the 6-digit code sent to ${email}.`}
            {step === STEPS.RESET && 'Choose a strong new password for your account.'}
          </Text>

          {/* Accessible Live Regions for Messages */}
          {errorMessage ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6"
            >
              <Feather name="alert-circle" size={18} color="#b91c1c" />
              <Text className="text-red-700 text-sm ml-2 flex-1 font-medium">{errorMessage}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View
              accessibilityLiveRegion="polite"
              className="flex-row items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6"
            >
              <Feather name="info" size={18} color="#1d4ed8" />
              <Text className="text-blue-700 text-sm ml-2 flex-1 font-medium">{infoMessage}</Text>
            </View>
          ) : null}

          {/* STEP 1: EMAIL */}
          {step === STEPS.EMAIL && (
            <>
              <Text className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isSubmitting}
                accessibilityLabel="Email address input"
                className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-2 text-base text-slate-900"
              />
              <SubmitButton label="Send OTP" onPress={handleRequestOtp} isSubmitting={isSubmitting} />
            </>
          )}

          {/* STEP 2: OTP */}
          {step === STEPS.OTP && (
            <>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isSubmitting}
                  style={[inputStyle, { textAlign: 'center', fontSize: 22, letterSpacing: 8, paddingRight: 90 }]}
                />
                <Pressable
                  onPress={handlePasteOtp}
                  disabled={isSubmitting}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 13 }}>Paste</Text>
                </Pressable>
              </View>

              <SubmitButton label="Verify OTP" onPress={handleVerifyOtp} isSubmitting={isSubmitting} />
              <Pressable onPress={handleRequestOtp} disabled={isSubmitting} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: '#3b82f6', fontSize: 13 }}>Resend OTP</Text>
              </Pressable>
            </>
          )}

          {/* STEP 3: RESET PASSWORD */}
          {step === STEPS.RESET && (
            <>
              <Text className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">New Password</Text>
              <View className="bg-white border border-slate-200 rounded-xl mb-4 flex-row items-center">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPassword}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                  accessibilityLabel="New password input"
                  className="flex-1 px-4 py-3.5 text-base text-slate-900"
                />
                <Pressable
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
                  className="p-3 mr-1"
                >
                  <Feather name={showNewPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                </Pressable>
              </View>

              <Text className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">Confirm Password</Text>
              <View className="bg-white border border-slate-200 rounded-xl mb-3 flex-row items-center">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  textContentType="newPassword"
                  editable={!isSubmitting}
                  accessibilityLabel="Confirm password input"
                  className="flex-1 px-4 py-3.5 text-base text-slate-900"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                  className="p-3 mr-1"
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#64748b" />
                </Pressable>
              </View>

              <View className="bg-slate-100 rounded-lg p-3 mb-2 flex-row">
                <Feather name="shield" size={16} color="#64748b" style={{ marginTop: 2 }} />
                <Text className="text-slate-500 text-xs ml-2 flex-1 leading-relaxed">
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

// Reusable Submit Button converted to Tailwind
function SubmitButton({ label, onPress, isSubmitting }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isSubmitting}
      accessibilityRole="button"
      accessibilityState={{ disabled: isSubmitting }}
      className={`rounded-xl py-4 items-center shadow-sm mt-5 ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 active:bg-blue-700'
        }`}
    >
      {isSubmitting ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white font-semibold text-base tracking-wide">{label}</Text>
      )}
    </Pressable>
  );
}