// src/context/CallProvider.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import { RTCAudioSession } from 'react-native-webrtc';
import { useCall, CALL_STATUS, END_REASON } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';
import { connectSocket, onSocketChange } from '@/sockets/socketManager';
import { callAudio } from '@/calls/callAudio';
import { DEFAULT_TUNE } from '@/calls/ringbackTunes';
import { DECLINE_URL, INCOMING_TIMEOUT_MS, callSubtitle } from '@/calls/backgroundCallTask';
import { storage } from '@/utils/storage';
import { getDeviceId } from '@/notifications/deviceId';
import { useAuthStore } from '@/store/authStore';
import { CallUi } from '../../modules/call-ui';

const CallContext = createContext(null);

const END_MESSAGES = {
  [END_REASON.NETWORK]: "Couldn't connect the call. One of you may be on a restricted network — try switching to Wi-Fi.",
  [END_REASON.BUSY]: 'The user is on another call.',
  [END_REASON.REJECTED]: 'Call declined.',
  [END_REASON.UNAVAILABLE]: "This person can't be reached right now. Try again later.",
  [END_REASON.CALLER_LEFT]: 'The caller hung up before you answered.',
};

const FSI_PROMPT_KEY = 'call_fsi_prompted_v1';
const BATTERY_PROMPT_KEY = 'call_battery_prompted_v1';
const PENDING_ACTION_TTL_MS = 30000;
const ACTIVE_STATUSES = [CALL_STATUS.RINGING_OUTGOING, CALL_STATUS.CONNECTING, CALL_STATUS.CONNECTED];
// OEMs known to kill background apps: incoming calls need an explicit battery exemption there.
const AGGRESSIVE_OEMS = ['xiaomi', 'redmi', 'poco', 'oppo', 'realme', 'oneplus', 'vivo', 'iqoo', 'samsung', 'huawei', 'honor', 'tecno', 'infinix', 'itel', 'motorola', 'asus', 'meizu', 'lenovo'];

function isAggressiveOem() {
  const maker = `${Device.manufacturer ?? ''} ${Device.brand ?? ''}`.toLowerCase();
  return AGGRESSIVE_OEMS.some((m) => maker.includes(m));
}

function syncWebRtcAudio(active) {
  if (Platform.OS !== 'ios') return;
  try {
    if (active) RTCAudioSession.audioSessionDidActivate();
    else RTCAudioSession.audioSessionDidDeactivate();
  } catch {}
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

export function CallProvider({ children }) {
  const call = useCall();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appActive = useAppActive();
  const shownReasonRef = useRef(null);
  const [pendingAction, setPendingAction] = useState(null);
  const ringingIdRef = useRef(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const speakerRef = useRef(false);
  speakerRef.current = isSpeaker;

  const incoming = call.incomingCall;
  const showIncoming = call.status === CALL_STATUS.RINGING_INCOMING && !!incoming;

  /* ── native call UI config (decline without JS, skip this device on cancel) ── */
  useEffect(() => {
    getDeviceId()
      .then((deviceId) => CallUi.setConfig({ deviceId, declineUrl: DECLINE_URL }))
      .catch(() => {});
  }, []);

  /* ── signaling listeners follow the active socket ─────────── */
  useEffect(() => {
    let detach = () => {};
    const off = onSocketChange((s) => {
      detach();
      detach = s ? call.attachSignalingListeners(s) : () => {};
    });
    return () => {
      off();
      detach();
    };
  }, [call.attachSignalingListeners]);

  /* ── end-of-call messages ─────────────────────────────────── */
  useEffect(() => {
    if (call.status !== CALL_STATUS.IDLE) {
      shownReasonRef.current = null;
      return;
    }
    const msg = END_MESSAGES[call.endReason];
    if (msg && shownReasonRef.current !== call.endReason) {
      shownReasonRef.current = call.endReason;
      setTimeout(() => Alert.alert('Call ended', msg), 400);
    }
  }, [call.endReason, call.status]);

  /* ── audio: ringtone only while visible; native notification rings otherwise ── */
  const ringbackTune = call.ringback ? call.ringback.tune || DEFAULT_TUNE : null;

  useEffect(() => {
    switch (call.status) {
      case CALL_STATUS.RINGING_INCOMING:
        if (appActive) callAudio.startRingtone();
        else callAudio.stopRingtone();
        break;
      case CALL_STATUS.RINGING_OUTGOING:
        if (ringbackTune) callAudio.startRingback(ringbackTune, speakerRef.current);
        break;
      case CALL_STATUS.CONNECTING:
      case CALL_STATUS.CONNECTED:
        callAudio.startSession(speakerRef.current);
        break;
      default:
        callAudio.stopAll();
        setIsSpeaker(false);
    }
  }, [call.status, ringbackTune, appActive]);

  useEffect(() => () => callAudio.stopAll(), []);

  /* ── native incoming-call notification mirrors the ringing state ── */
  useEffect(() => {
    if (showIncoming) {
      ringingIdRef.current = incoming.callId;
      if (appActive) {
        CallUi.dismissIncomingCall(incoming.callId);
      } else {
        CallUi.showIncomingCall({
          callId: incoming.callId,
          callerName: incoming.callerName,
          subtitle: callSubtitle(incoming.ticketNumber),
          declineUrl: DECLINE_URL,
          declineToken: incoming.declineToken ?? null,
          timeoutMs: INCOMING_TIMEOUT_MS,
        });
      }
      return;
    }
    if (ringingIdRef.current) {
      // Ended without being taken by the app (caller left, declined, stale): also end a call answered natively.
      if (call.status === CALL_STATUS.IDLE) CallUi.endCall(ringingIdRef.current);
      else CallUi.dismissIncomingCall(ringingIdRef.current);
      ringingIdRef.current = null;
    }
  }, [showIncoming, incoming?.callId, appActive, call.status]);

  useEffect(() => {
    if (call.status === CALL_STATUS.IDLE) CallUi.setShowWhenLocked(false);
  }, [call.status]);

  /* ── native call state follows the app's call ─────────────── */
  const nativeCallIdRef = useRef(null);
  const inCall = ACTIVE_STATUSES.includes(call.status);

  useEffect(() => {
    if (inCall && call.activeCallId) {
      nativeCallIdRef.current = call.activeCallId;
      CallUi.setActiveCall(call.activeCallId);
      return;
    }
    if (call.status === CALL_STATUS.IDLE) {
      CallUi.setActiveCall(null);
      CallUi.stopOngoingCall();
      if (nativeCallIdRef.current) {
        CallUi.endCall(nativeCallIdRef.current);
        nativeCallIdRef.current = null;
      }
    }
  }, [inCall, call.status, call.activeCallId]);

  // Android: keep mic + audio alive in the background once the mic is actually open.
  const hasLocalStream = !!call.localStream;
  useEffect(() => {
    const live = (call.status === CALL_STATUS.CONNECTING || call.status === CALL_STATUS.CONNECTED) && hasLocalStream;
    if (live && call.activeCallId) CallUi.startOngoingCall({ callId: call.activeCallId, callerName: call.peerName });
  }, [call.status, hasLocalStream, call.activeCallId, call.peerName]);

  // iOS: mute button in the CallKit UI and in the app stay in step.
  useEffect(() => {
    if (inCall && call.activeCallId) CallUi.setMuted(call.activeCallId, call.isMuted);
  }, [inCall, call.activeCallId, call.isMuted]);

  // iOS: CallKit owns the audio session; WebRTC must be told when it is activated.
  useEffect(() => {
    if (CallUi.isAudioSessionActive()) syncWebRtcAudio(true);
    const sub = CallUi.addAudioSessionListener(syncWebRtcAudio);
    return () => sub.remove();
  }, []);

  /* ── stale ringing: confirm with the server whenever the app wakes ── */
  useEffect(() => {
    if (appActive && call.status === CALL_STATUS.RINGING_INCOMING) call.verifyIncoming();
  }, [appActive, call.status, call.verifyIncoming]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => {
      const next = !prev;
      callAudio.setSpeaker(next);
      return next;
    });
  }, []);

  const handleAccept = useCallback(async () => {
    callAudio.stopRingtone();
    try {
      await call.acceptCall();
    } catch (err) {
      setTimeout(
        () =>
          Alert.alert(
            'Call failed',
            err?.reason === END_REASON.PERMISSION
              ? 'Allow microphone access in Settings to answer calls.'
              : 'Could not connect the call.'
          ),
        400
      );
    }
  }, [call.acceptCall]);

  /* ── actions from the native call UI (notification / CallKit) ── */
  const callRef = useRef(call);
  callRef.current = call;

  const handleNativeAction = useCallback((evt) => {
    if (!evt?.callId || !evt?.action) return;
    const callId = String(evt.callId);
    const at = Number(evt.at) || Date.now();
    if (Date.now() - at > PENDING_ACTION_TTL_MS) return;
    const current = callRef.current;
    const isCurrent = current.activeCallId === callId;

    if (evt.action === 'mute') {
      if (isCurrent) current.setMuted(!!evt.muted);
      return;
    }
    if (evt.action === 'end') {
      setPendingAction((prev) => (prev?.callId === callId ? null : prev));
      if (isCurrent) current.endCall();
      else if (current.incomingCall?.callId === callId) current.rejectCall();
      return;
    }
    setPendingAction({ action: evt.action, callId, at });
    connectSocket();
  }, []);

  const drainNativeActions = useCallback(() => {
    for (const evt of CallUi.consumePendingActions()) handleNativeAction(evt);
  }, [handleNativeAction]);

  useEffect(() => {
    const sub = CallUi.addActionListener(handleNativeAction);
    drainNativeActions();
    return () => sub.remove();
  }, [handleNativeAction, drainNativeActions]);

  useEffect(() => {
    if (appActive) drainNativeActions();
  }, [appActive, drainNativeActions]);

  useEffect(() => {
    if (!pendingAction) return undefined;
    const expire = () => {
      setPendingAction(null);
      if (pendingAction.action === 'answer' && callRef.current.activeCallId !== pendingAction.callId) {
        // Answered on the lock screen but the invite never arrived (offline, or the caller already left).
        CallUi.endCall(pendingAction.callId);
        Alert.alert('Call ended', "Couldn't connect the call. Check your connection and call back.");
      }
    };
    const left = PENDING_ACTION_TTL_MS - (Date.now() - pendingAction.at);
    if (left <= 0) {
      expire();
      return undefined;
    }
    if (showIncoming && incoming.callId === pendingAction.callId) {
      if (pendingAction.action === 'decline') {
        setPendingAction(null);
        call.rejectCall();
      } else if (pendingAction.action === 'answer') {
        if (incoming.offerSdp) {
          setPendingAction(null);
          handleAccept();
        }
      } else {
        setPendingAction(null);
      }
      return undefined;
    }
    const t = setTimeout(expire, left);
    return () => clearTimeout(t);
  }, [pendingAction, showIncoming, incoming?.callId, incoming?.offerSdp, call.rejectCall, handleAccept]);

  /* ── one-time ask for lock-screen call alerts (Android 14+) ── */
  useEffect(() => {
    if (!isAuthenticated || !CallUi.isAvailable || CallUi.canUseFullScreenIntent()) return;
    let cancelled = false;
    (async () => {
      const asked = await storage.getItemAsync(FSI_PROMPT_KEY).catch(() => null);
      if (asked || cancelled) return;
      await storage.setItemAsync(FSI_PROMPT_KEY, '1').catch(() => {});
      Alert.alert(
        'Show calls on your lock screen',
        'Allow Samadhan to show incoming calls full screen so you can answer even when your phone is locked.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Allow', onPress: () => CallUi.openFullScreenIntentSettings() },
        ]
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  /* ── one-time battery exemption on OEMs that kill background apps ── */
  useEffect(() => {
    if (Platform.OS !== 'android' || !isAuthenticated || !CallUi.isAvailable) return;
    if (!isAggressiveOem() || CallUi.isIgnoringBatteryOptimizations()) return;
    let cancelled = false;
    (async () => {
      const asked = await storage.getItemAsync(BATTERY_PROMPT_KEY).catch(() => null);
      if (asked || cancelled) return;
      await storage.setItemAsync(BATTERY_PROMPT_KEY, '1').catch(() => {});
      Alert.alert(
        "Don't miss calls",
        'Your phone may stop Samadhan in the background, so calls would not ring. Allow Samadhan to run in the background (set battery to "Unrestricted" and turn on Autostart if your phone has it).',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => CallUi.openBatteryOptimizationSettings() },
        ]
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const showInCall = [
    CALL_STATUS.RINGING_OUTGOING,
    CALL_STATUS.CONNECTING,
    CALL_STATUS.CONNECTED,
  ].includes(call.status);

  const value = useMemo(() => ({ ...call, isSpeaker, toggleSpeaker }), [call, isSpeaker, toggleSpeaker]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {showIncoming && (
        <IncomingCallModal
          callerName={incoming.callerName}
          onAccept={handleAccept}
          onReject={call.rejectCall}
        />
      )}
      {showInCall && <InCallScreen call={value} />}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used within CallProvider');
  return ctx;
}
