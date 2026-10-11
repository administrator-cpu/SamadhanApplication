// src/hooks/useCall.js
import { useCallback, useRef, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { RTC_CONFIG, CALL_STATUS } from '@/calls/webrtcConfig';
import {
  emitOffer,
  emitAnswer,
  emitIceCandidate,
  emitAccept,
  emitReject,
  emitCancel,
  emitEnd,
  emitInvite,
  bindCallListeners,
} from '@/sockets/callSignaling';
import { useAuthStore } from '@/store/authStore';

export { CALL_STATUS };

export function useCall() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState(CALL_STATUS.IDLE);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  const pcRef = useRef(null);
  const callIdRef = useRef(null);
  const peerEmailRef = useRef(null);
  const pendingCandidatesRef = useRef({}); // callId -> candidates[]
  const statusRef = useRef(CALL_STATUS.IDLE);
  const timeoutRef = useRef(null);

  const setStatusSafe = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearRingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearRingTimeout();
    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = null;
    peerEmailRef.current = null;
    pendingCandidatesRef.current = {};
    setRemoteStream(null);
    setIsMuted(false);
    setIncomingCall(null);
    setStatusSafe(CALL_STATUS.IDLE);
  }, [setStatusSafe, clearRingTimeout]);

  const flushCandidates = useCallback(async (pc, callId) => {
    const queued = pendingCandidatesRef.current[callId] || [];
    delete pendingCandidatesRef.current[callId];
    for (const c of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
  }, []);

  const createPeerConnection = useCallback(
    (toEmail, callId) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          emitIceCandidate({ toEmail, callId, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          clearRingTimeout();
          setStatusSafe(CALL_STATUS.CONNECTED);
        }
        if (['failed', 'closed'].includes(pc.connectionState)) {
          cleanup();
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup, setStatusSafe, clearRingTimeout]
  );

  const getLocalAudioStream = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);
    return stream;
  }, []);

  const cancelOutgoing = useCallback(() => {
    if (peerEmailRef.current && callIdRef.current) {
      emitCancel({ toEmail: peerEmailRef.current, callId: callIdRef.current });
    }
    cleanup();
  }, [cleanup]);

  const startCall = useCallback(
    async ({ toEmail, ticketId }) => {
      const callId = `${user.id}-${Date.now()}`;
      callIdRef.current = callId;
      peerEmailRef.current = toEmail;
      setStatusSafe(CALL_STATUS.RINGING_OUTGOING);

      try {
        const stream = await getLocalAudioStream();
        const pc = createPeerConnection(toEmail, callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        emitInvite({ toEmail, ticketId, callId, callerName: user.name });

        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        emitOffer({ toEmail, callId, sdp: pc.localDescription });

        clearRingTimeout();
        timeoutRef.current = setTimeout(() => {
          if (statusRef.current === CALL_STATUS.RINGING_OUTGOING) {
            cancelOutgoing();
          }
        }, 30000);
      } catch (err) {
        cleanup();
        throw err;
      }

      return callId;
    },
    [
      user,
      getLocalAudioStream,
      createPeerConnection,
      cleanup,
      setStatusSafe,
      clearRingTimeout,
      cancelOutgoing,
    ]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { fromEmail, callId, offerSdp } = incomingCall;
    callIdRef.current = callId;
    peerEmailRef.current = fromEmail;
    setStatusSafe(CALL_STATUS.CONNECTING);
    setIncomingCall(null);

    try {
      const stream = await getLocalAudioStream();
      const pc = createPeerConnection(fromEmail, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      await flushCandidates(pc, callId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emitAnswer({ toEmail: fromEmail, callId, sdp: pc.localDescription });
      emitAccept({ toEmail: fromEmail, callId });
    } catch (err) {
      cleanup();
      throw err;
    }
  }, [
    incomingCall,
    getLocalAudioStream,
    createPeerConnection,
    flushCandidates,
    cleanup,
    setStatusSafe,
  ]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    emitReject({ toEmail: incomingCall.fromEmail, callId: incomingCall.callId });
    cleanup();
  }, [incomingCall, cleanup]);

  const endCall = useCallback(() => {
    if (peerEmailRef.current && callIdRef.current) {
      emitEnd({ toEmail: peerEmailRef.current, callId: callIdRef.current });
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, [localStream]);

  const attachSignalingListeners = useCallback(
    (socket) =>
      bindCallListeners(
        {
          onInvite: ({ fromEmail, callId, ticketId, callerName }) => {
            if (statusRef.current !== CALL_STATUS.IDLE) return;
            setIncomingCall((prev) => ({
              ...(prev && prev.callId === callId ? prev : {}),
              fromEmail,
              callId,
              ticketId,
              callerName,
            }));
            setStatusSafe(CALL_STATUS.RINGING_INCOMING);
          },
          onOffer: ({ fromEmail, callId, sdp }) => {
            setIncomingCall((prev) =>
              prev && prev.callId === callId
                ? { ...prev, offerSdp: sdp }
                : { fromEmail, callId, offerSdp: sdp }
            );
          },
          onAnswer: async ({ callId, sdp }) => {
            const pc = pcRef.current;
            if (callIdRef.current !== callId || !pc) return;
            clearRingTimeout();
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushCandidates(pc, callId);
          },
          onIceCandidate: ({ callId, candidate }) => {
            const pc = pcRef.current;
            if (pc && callIdRef.current === callId && pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            } else {
              (pendingCandidatesRef.current[callId] ||= []).push(candidate);
            }
          },
          onAccept: () => setStatusSafe(CALL_STATUS.CONNECTING),
          onReject: () => cleanup(),
          onCancel: () => cleanup(),
          onEnd: () => cleanup(),
          onBusy: () => cleanup(),
        },
        socket
      ),
    [cleanup, setStatusSafe, clearRingTimeout, flushCandidates]
  );

  return {
    status,
    localStream,
    remoteStream,
    isMuted,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelOutgoing,
    toggleMute,
    attachSignalingListeners,
  };
}