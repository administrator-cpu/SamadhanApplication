import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = Platform.OS === 'android' ? requireOptionalNativeModule('CallUi') : null;

const noop = () => {};

export const CallUi = {
  isAvailable: !!Native,
  showIncomingCall: ({ callId, callerName, subtitle = null, declineUrl = null, declineToken = null, timeoutMs = 45000 }) =>
    Native?.showIncomingCall(String(callId), callerName || 'Incoming call', subtitle, declineUrl, declineToken, timeoutMs),
  dismissIncomingCall: (callId) => (callId ? Native?.dismissIncomingCall(String(callId)) : undefined),
  dismissAllIncomingCalls: () => Native?.dismissAllIncomingCalls(),
  consumeLaunchAction: () => Native?.consumeLaunchAction() ?? null,
  setShowWhenLocked: (visible) => Native?.setShowWhenLocked(!!visible),
  canUseFullScreenIntent: () => (Native ? Native.canUseFullScreenIntent() : true),
  openFullScreenIntentSettings: () => Native?.openFullScreenIntentSettings(),
  addActionListener: (cb) => (Native ? Native.addListener('onAction', cb) : { remove: noop }),
};
