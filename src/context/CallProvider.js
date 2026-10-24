// src/context/CallProvider.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useCall, CALL_STATUS, END_REASON } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';
import { connectSocket, onSocketChange } from '@/sockets/socketManager';
import { callAudio } from '@/calls/callAudio';
import { DEFAULT_TUNE } from '@/calls/ringbackTunes';
import Notifications from '@/utils/notificationsSafe';

const CallContext = createContext(null);

const END_MESSAGES = {
  [END_REASON.NETWORK]: "Couldn't connect the call. One of you may be on a restricted network — try switching to Wi-Fi.",
  [END_REASON.BUSY]: 'The user is on another call.',
  [END_REASON.REJECTED]: 'Call declined.',
  [END_REASON.UNAVAILABLE]: "This person can't be reached right now. Try again later.",
};

const CALL_PUSH_TYPES = new Set(['call_invite']);

async function dismissCallNotifications(callId) {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => {
          const data = n.request?.content?.data;
          return CALL_PUSH_TYPES.has(data?.type) && (!callId || data?.callId === callId);
        })
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {}
}

export function CallProvider({ children }) {
  const call = useCall();
  const shownReasonRef = useRef(null);
  const autoAnswerRef = useRef(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const speakerRef = useRef(false);
  speakerRef.current = isSpeaker;

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

  const ringbackTune = call.ringback ? call.ringback.tune || DEFAULT_TUNE : null;

  useEffect(() => {
    switch (call.status) {
      case CALL_STATUS.RINGING_INCOMING:
        callAudio.startRingtone();
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
  }, [call.status, ringbackTune]);

  useEffect(() => () => callAudio.stopAll(), []);

  useEffect(() => {
    if (call.status !== CALL_STATUS.RINGING_INCOMING) dismissCallNotifications();
  }, [call.status]);

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

  useEffect(() => {
    const handle = (response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type !== 'call_invite' || !data.callId) return;
      connectSocket();
      if (response.actionIdentifier === 'answer') autoAnswerRef.current = data.callId;
      Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
    };
    Notifications.getLastNotificationResponseAsync?.()
      .then(handle)
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, []);

  const incoming = call.incomingCall;
  const showIncoming = call.status === CALL_STATUS.RINGING_INCOMING && !!incoming;

  useEffect(() => {
    if (!showIncoming || !incoming?.offerSdp) return;
    if (autoAnswerRef.current !== incoming.callId) return;
    autoAnswerRef.current = null;
    handleAccept();
  }, [showIncoming, incoming?.callId, incoming?.offerSdp, handleAccept]);

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
