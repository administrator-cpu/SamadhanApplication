// src/context/CallProvider.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { useCall, CALL_STATUS, END_REASON } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';
import { connectSocket, onSocketChange } from '@/sockets/socketManager';
import { callAudio } from '@/calls/callAudio';
import { DEFAULT_TUNE } from '@/calls/ringbackTunes';
import { DECLINE_URL, INCOMING_TIMEOUT_MS, callSubtitle } from '@/calls/backgroundCallTask';
import { storage } from '@/utils/storage';
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
const PENDING_ACTION_TTL_MS = 30000;

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
      CallUi.dismissIncomingCall(ringingIdRef.current);
      ringingIdRef.current = null;
    }
  }, [showIncoming, incoming?.callId, appActive]);

  useEffect(() => {
    if (call.status === CALL_STATUS.IDLE) CallUi.setShowWhenLocked(false);
  }, [call.status]);

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

  /* ── actions from the native call notification ─────────────── */
  const handleNativeAction = useCallback((evt) => {
    if (!evt?.callId || !evt?.action) return;
    setPendingAction({ action: evt.action, callId: String(evt.callId), at: Date.now() });
    connectSocket();
  }, []);

  useEffect(() => {
    const sub = CallUi.addActionListener(handleNativeAction);
    handleNativeAction(CallUi.consumeLaunchAction());
    return () => sub.remove();
  }, [handleNativeAction]);

  useEffect(() => {
    if (appActive) handleNativeAction(CallUi.consumeLaunchAction());
  }, [appActive, handleNativeAction]);

  useEffect(() => {
    if (!pendingAction) return undefined;
    const left = PENDING_ACTION_TTL_MS - (Date.now() - pendingAction.at);
    if (left <= 0) {
      setPendingAction(null);
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
    const t = setTimeout(() => setPendingAction(null), left);
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
