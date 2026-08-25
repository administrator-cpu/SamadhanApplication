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
  const peerUserIdRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const statusRef = useRef(CALL_STATUS.IDLE);

  const setStatusSafe = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const cleanup = useCallback(() => {
    setLocalStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    pcRef.current?.close();
    pcRef.current = null;
    callIdRef.current = null;
    peerUserIdRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    setIsMuted(false);
    setIncomingCall(null);
    setStatusSafe(CALL_STATUS.IDLE);
  }, [setStatusSafe]);

  const createPeerConnection = useCallback(
    (toUserId, callId) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          emitIceCandidate({ toUserId, callId, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatusSafe(CALL_STATUS.CONNECTED);
        }
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          cleanup();
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup, setStatusSafe]
  );

  const getLocalAudioStream = useCallback(async () => {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback(
    async ({ toUserId, ticketId }) => {
      const callId = `${user.id}-${Date.now()}`;
      callIdRef.current = callId;
      peerUserIdRef.current = toUserId;
      setStatusSafe(CALL_STATUS.RINGING_OUTGOING);

      try {
        const stream = await getLocalAudioStream();
        const pc = createPeerConnection(toUserId, callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        emitInvite({ toUserId, ticketId, callId, callerName: user.name });

        const offer = await pc.createOffer({});
        await pc.setLocalDescription(offer);
        emitOffer({ toUserId, callId, sdp: pc.localDescription });
      } catch (err) {
        cleanup();
        throw err;
      }

      return callId;
    },
    [user, getLocalAudioStream, createPeerConnection, cleanup, setStatusSafe]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { fromUserId, callId, offerSdp } = incomingCall;
    callIdRef.current = callId;
    peerUserIdRef.current = fromUserId;
    setStatusSafe(CALL_STATUS.CONNECTING);
    setIncomingCall(null);

    try {
      const stream = await getLocalAudioStream();
      const pc = createPeerConnection(fromUserId, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      pendingCandidatesRef.current.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)));
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emitAnswer({ toUserId: fromUserId, callId, sdp: pc.localDescription });
      emitAccept({ toUserId: fromUserId, callId });
    } catch (err) {
      cleanup();
      throw err;
    }
  }, [incomingCall, getLocalAudioStream, createPeerConnection, cleanup, setStatusSafe]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    emitReject({ toUserId: incomingCall.fromUserId, callId: incomingCall.callId });
    setIncomingCall(null);
    setStatusSafe(CALL_STATUS.IDLE);
  }, [incomingCall, setStatusSafe]);

  const endCall = useCallback(() => {
    if (peerUserIdRef.current && callIdRef.current) {
      emitEnd({ toUserId: peerUserIdRef.current, callId: callIdRef.current });
    }
    cleanup();
  }, [cleanup]);

  const cancelOutgoing = useCallback(() => {
    if (peerUserIdRef.current && callIdRef.current) {
      emitCancel({ toUserId: peerUserIdRef.current, callId: callIdRef.current });
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

  const attachSignalingListeners = useCallback(() => {
    return bindCallListeners({
      onInvite: ({ fromUserId, callId, ticketId, callerName }) => {
        if (statusRef.current !== CALL_STATUS.IDLE) return; // already on a call
        setIncomingCall({ fromUserId, callId, ticketId, callerName });
        setStatusSafe(CALL_STATUS.RINGING_INCOMING);
      },
      onOffer: ({ fromUserId, callId, sdp }) => {
        setIncomingCall((prev) =>
          prev && prev.callId === callId
            ? { ...prev, offerSdp: sdp }
            : { fromUserId, callId, offerSdp: sdp }
        );
      },
      onAnswer: async ({ callId, sdp }) => {
        if (callIdRef.current !== callId || !pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        pendingCandidatesRef.current.forEach((c) =>
          pcRef.current.addIceCandidate(new RTCIceCandidate(c))
        );
        pendingCandidatesRef.current = [];
      },
      onIceCandidate: ({ callId, candidate }) => {
        if (callIdRef.current !== callId) return;
        if (pcRef.current?.remoteDescription) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      },
      onAccept: () => setStatusSafe(CALL_STATUS.CONNECTING),
      onReject: () => cleanup(),
      onCancel: () => cleanup(),
      onEnd: () => cleanup(),
      onBusy: () => cleanup(),
    });
  }, [cleanup, setStatusSafe]);

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