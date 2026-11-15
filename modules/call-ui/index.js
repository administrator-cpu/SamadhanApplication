import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const Native = Platform.OS === 'android' || Platform.OS === 'ios' ? requireOptionalNativeModule('CallUi') : null;
const isIOS = Platform.OS === 'ios';

const noop = () => {};
const noSub = { remove: noop };

export const CallUi = {
  isAvailable: !!Native,
  /** iOS rings through CallKit (system UI); Android through a full-screen notification. */
  usesCallKit: isIOS && !!Native,

  setConfig: ({ deviceId = null, declineUrl = null }) => Native?.setConfig?.(deviceId, declineUrl),

  showIncomingCall: ({ callId, callerName, subtitle = null, declineUrl = null, declineToken = null, timeoutMs = 45000 }) =>
    Native?.showIncomingCall(String(callId), callerName || 'Incoming call', subtitle, declineUrl, declineToken, timeoutMs),
  /** Stops ringing. Never ends a call that was already answered natively. */
  dismissIncomingCall: (callId) => (callId ? Native?.dismissIncomingCall(String(callId)) : undefined),
  dismissAllIncomingCalls: () => Native?.dismissAllIncomingCalls(),
  /** Ends the native call in any state (CallKit call on iOS, ongoing-call service on Android). */
  endCall: (callId) => (callId ? Native?.endCall?.(String(callId)) : undefined),

  /** The app's current call (or null): new native rings are suppressed while busy. */
  setActiveCall: (callId) => Native?.setActiveCall?.(callId ? String(callId) : null),
  setMuted: (callId, muted) => (callId ? Native?.setMuted?.(String(callId), !!muted) : undefined),

  /** Android: foreground service that keeps mic + audio alive while the call is in the background. */
  startOngoingCall: ({ callId, callerName }) =>
    callId ? Native?.startOngoingCall?.(String(callId), callerName || 'Call') : undefined,
  stopOngoingCall: () => Native?.stopOngoingCall?.(),

  /** Answer / decline / end taps that happened before JS was listening (cold start). */
  consumePendingActions: () => {
    if (!Native) return [];
    if (typeof Native.consumePendingActions === 'function') return Native.consumePendingActions() ?? [];
    const launch = Native.consumeLaunchAction?.();
    return launch ? [launch] : [];
  },

  getVoipToken: () => (isIOS ? Native?.getVoipToken?.() ?? null : null),
  addVoipTokenListener: (cb) => (isIOS && Native ? Native.addListener('onVoipToken', (e) => cb(e?.token || null)) : noSub),
  isAudioSessionActive: () => (isIOS ? !!Native?.isAudioSessionActive?.() : false),
  addAudioSessionListener: (cb) => (isIOS && Native ? Native.addListener('onAudioSession', (e) => cb(!!e?.active)) : noSub),

  setShowWhenLocked: (visible) => Native?.setShowWhenLocked?.(!!visible),
  canUseFullScreenIntent: () => (Native?.canUseFullScreenIntent ? Native.canUseFullScreenIntent() : true),
  openFullScreenIntentSettings: () => Native?.openFullScreenIntentSettings?.(),
  isIgnoringBatteryOptimizations: () => (Native?.isIgnoringBatteryOptimizations ? Native.isIgnoringBatteryOptimizations() : true),
  openBatteryOptimizationSettings: () => Native?.openBatteryOptimizationSettings?.(),

  addActionListener: (cb) => (Native ? Native.addListener('onAction', cb) : noSub),
};
