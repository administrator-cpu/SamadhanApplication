// src/context/CallProvider.js
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCall, CALL_STATUS } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';

const CallContext = createContext(null);

const RING_PATTERN = [0, 1000, 1000];

export function CallProvider({ children }) {
  const call = useCall();
  const detachRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    detachRef.current = call.attachSignalingListeners();
    return () => detachRef.current?.();
  }, [call.attachSignalingListeners]);

  const showIncoming = call.status === CALL_STATUS.RINGING_INCOMING && call.incomingCall;
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
      } catch (err) {
        // ringtone asset missing/failed — vibration still runs
      }
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

    if (showIncoming) {
      startRinging();
    } else {
      stopRinging();
    }

    return () => {
      cancelled = true;
      stopRinging();
    };
  }, [showIncoming]);

  return (
    <CallContext.Provider value={call}>
      {children}
      {showIncoming && (
        <IncomingCallModal
          callerName={call.incomingCall.callerName}
          onAccept={call.acceptCall}
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