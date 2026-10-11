// src/context/CallProvider.js
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Vibration, Alert } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCall, CALL_STATUS, END_REASON } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';
import { onSocketChange } from '@/sockets/socketManager';

const CallContext = createContext(null);

const RING_PATTERN = [0, 1000, 1000];

const END_MESSAGES = {
  [END_REASON.NETWORK]: "Couldn't connect the call. One of you may be on a restricted network — try switching to Wi-Fi.",
  [END_REASON.BUSY]: 'The user is on another call.',
  [END_REASON.REJECTED]: 'Call declined.',
};

export function CallProvider({ children }) {
  const call = useCall();
  const playerRef = useRef(null);
  const shownReasonRef = useRef(null);

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
      Alert.alert('Call ended', msg);
    }
  }, [call.endReason, call.status]);

  const showIncoming = call.status === CALL_STATUS.RINGING_INCOMING && !!call.incomingCall;
  const showInCall = [
    CALL_STATUS.RINGING_OUTGOING,
    CALL_STATUS.CONNECTING,
    CALL_STATUS.CONNECTED,
  ].includes(call.status);

  useEffect(() => {
    let cancelled = false;

    async function startRinging() {
      Vibration.vibrate(RING_PATTERN, true);
      try {
        await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
        const player = createAudioPlayer(require('../../assets/sounds/ringtone.mp3'));
        if (cancelled) {
          player.remove();
          return;
        }
        player.loop = true;
        player.volume = 1.0;
        playerRef.current = player;
        player.play();
      } catch (err) {}
    }

    function stopRinging() {
      Vibration.cancel();
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.remove();
        } catch (err) {}
        playerRef.current = null;
      }
    }

    if (showIncoming) startRinging();
    else stopRinging();

    return () => {
      cancelled = true;
      stopRinging();
    };
  }, [showIncoming]);

  const handleAccept = async () => {
    try {
      await call.acceptCall();
    } catch (err) {
      Alert.alert(
        'Call failed',
        err?.reason === END_REASON.PERMISSION
          ? 'Allow microphone access in Settings to answer calls.'
          : 'Could not connect the call.'
      );
    }
  };

  return (
    <CallContext.Provider value={call}>
      {children}
      {showIncoming && (
        <IncomingCallModal
          callerName={call.incomingCall.callerName}
          onAccept={handleAccept}
          onReject={call.rejectCall}
        />
      )}
      {showInCall && <InCallScreen call={call} />}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used within CallProvider');
  return ctx;
}