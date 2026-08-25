// src/context/CallProvider.js
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useCall, CALL_STATUS } from '@/hooks/useCall';
import IncomingCallModal from '@/components/calls/IncomingCallModal';
import InCallScreen from '@/components/calls/InCallScreen';

const CallContext = createContext(null);

export function CallProvider({ children }) {
  const call = useCall();
  const detachRef = useRef(null);

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