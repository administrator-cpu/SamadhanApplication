// src/hooks/useCall.js
import { useCallback, useRef, useState } from 'react';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import {
  RTC_CONFIG,
  CALL_STATUS,
  RING_TIMEOUT_MS,
  CONNECT_TIMEOUT_MS,
  DISCONNECT_GRACE_MS,
} from '@/calls/webrtcConfig';
import {
  emitOffer,
  emitAnswer,
  emitIceCandidate,
  emitAccept,
  emitReject,
  emitCancel,
  emitEnd,
  emitInvite,
  emitBusy,
  bindCallListeners,
} from '@/sockets/callSignaling';
import { connectSocket } from '@/sockets/socketManager';
import { useAuthStore } from '@/store/authStore';

export { CALL_STATUS };

export const END_REASON = {
  NO_ANSWER: 'no_answer',
  REJECTED: 'rejected',
  BUSY: 'busy',
  NETWORK: 'network',
  PERMISSION: 'permission',
  OFFLINE: 'offline',
};

export function useCall() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState(CALL_STATUS.IDLE);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [endReason, setEndReason] = useState(null);

  const pcRef = useRef(null);
  const callIdRef = useRef(null);
  const ringingCallIdRef = useRef(null);
  const peerEmailRef = useRef(null);
  const pendingCandidatesRef = useRef({});
  const statusRef = useRef(CALL_STATUS.IDLE);
  const timeoutRef = useRef(null);
  const graceRef = useRef(null);

  const setStatusSafe = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (graceRef.current) clearTimeout(graceRef.current);
    timeoutRef.current = null;
    graceRef.current = null;
  }, []);

  const cleanup = useCallback(
    (reason = null) => {
      clearTimers();
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      const pc = pcRef.current;
      pcRef.current = null;
      if (pc) {
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.ontrack = null;
        pc.close();
      }
      callIdRef.current = null;
      ringingCallIdRef.current = null;
      peerEmailRef.current = null;
      pendingCandidatesRef.current = {};
      setRemoteStream(null);
      setIsMuted(false);
      setIncomingCall(null);
      setEndReason(reason);
      setStatusSafe(CALL_STATUS.IDLE);
    },
    [setStatusSafe, clearTimers]
  );

  const hangUp = useCallback(
    (reason) => {
      if (peerEmailRef.current && callIdRef.current) {
        emitEnd({ toEmail: peerEmailRef.current, callId: callIdRef.current });
      }
      cleanup(reason);
    },
    [cleanup]
  );

  const armTimeout = useCallback((ms, onFire) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onFire, ms);
  }, []);

  const armConnectTimeout = useCallback(() => {
    armTimeout(CONNECT_TIMEOUT_MS, () => {
      if (statusRef.current !== CALL_STATUS.CONNECTED) hangUp(END_REASON.NETWORK);
    });
  }, [armTimeout, hangUp]);

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
        if (e.candidate) emitIceCandidate({ toEmail, callId, candidate: e.candidate });
      };

      const onState = () => {
        if (pcRef.current !== pc) return;
        const state = pc.connectionState || pc.iceConnectionState;

        if (state === 'connected' || state === 'completed') {
          clearTimers();
          setStatusSafe(CALL_STATUS.CONNECTED);
          return;
        }
        if (state === 'disconnected') {
          if (graceRef.current) return;
          graceRef.current = setTimeout(() => {
            graceRef.current = null;
            const s = pc.connectionState || pc.iceConnectionState;
            if (pcRef.current === pc && s !== 'connected' && s !== 'completed') {
              hangUp(END_REASON.NETWORK);
            }
          }, DISCONNECT_GRACE_MS);
          return;
        }
        if (state === 'failed') hangUp(END_REASON.NETWORK);
      };

      pc.onconnectionstatechange = onState;
      pc.oniceconnectionstatechange = onState;

      pc.ontrack = (e) => {
        if (e.streams?.[0]) setRemoteStream(e.streams[0]);
      };

      pcRef.current = pc;
      return pc;
    },
    [clearTimers, setStatusSafe, hangUp]
  );

  const getLocalAudioStream = useCallback(async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const e = new Error('Microphone permission denied');
      e.reason = END_REASON.PERMISSION;
      throw e;
    }
  }, []);

  const cancelOutgoing = useCallback(() => {
    if (peerEmailRef.current && callIdRef.current) {
      emitCancel({ toEmail: peerEmailRef.current, callId: callIdRef.current });
    }
    cleanup(END_REASON.NO_ANSWER);
  }, [cleanup]);

  const startCall = useCallback(
    async ({ toEmail, ticketId }) => {
      if (statusRef.current !== CALL_STATUS.IDLE) return null;

      const callId = `${user.id}-${Date.now()}`;
      callIdRef.current = callId;
      peerEmailRef.current = toEmail;
      setEndReason(null);
      setStatusSafe(CALL_STATUS.RINGING_OUTGOING);

      try {
        const stream = await getLocalAudioStream();

        const socket = await connectSocket();
        if (!socket?.connected) {
          await new Promise((resolve, reject) => {
            if (!socket) return reject(Object.assign(new Error('offline'), { reason: END_REASON.OFFLINE }));
            const t = setTimeout(() => {
              socket.off('connect', ok);
              reject(Object.assign(new Error('offline'), { reason: END_REASON.OFFLINE }));
            }, 5000);
            function ok() {
              clearTimeout(t);
              resolve();
            }
            socket.once('connect', ok);
          });
        }

        if (callIdRef.current !== callId) return null;

        const pc = createPeerConnection(toEmail, callId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        emitInvite({ toEmail, ticketId, callId, callerName: user.name });

        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);
        emitOffer({ toEmail, callId, sdp: pc.localDescription });

        armTimeout(RING_TIMEOUT_MS, () => {
          if (statusRef.current === CALL_STATUS.RINGING_OUTGOING) cancelOutgoing();
        });
      } catch (err) {
        cleanup(err?.reason ?? END_REASON.NETWORK);
        throw err;
      }

      return callId;
    },
    [user, getLocalAudioStream, createPeerConnection, cleanup, setStatusSafe, armTimeout, cancelOutgoing]
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall?.offerSdp) return;
    const { fromEmail, callId, offerSdp } = incomingCall;
    callIdRef.current = callId;
    ringingCallIdRef.current = null;
    peerEmailRef.current = fromEmail;
    setEndReason(null);
    setStatusSafe(CALL_STATUS.CONNECTING);
    setIncomingCall(null);

    try {
      const stream = await getLocalAudioStream();
      if (callIdRef.current !== callId) return;

      const pc = createPeerConnection(fromEmail, callId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      await flushCandidates(pc, callId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emitAnswer({ toEmail: fromEmail, callId, sdp: pc.localDescription });
      emitAccept({ toEmail: fromEmail, callId });
      armConnectTimeout();
    } catch (err) {
      emitReject({ toEmail: fromEmail, callId });
      cleanup(err?.reason ?? END_REASON.NETWORK);
      throw err;
    }
  }, [incomingCall, getLocalAudioStream, createPeerConnection, flushCandidates, cleanup, setStatusSafe, armConnectTimeout]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    emitReject({ toEmail: incomingCall.fromEmail, callId: incomingCall.callId });
    cleanup();
  }, [incomingCall, cleanup]);

  const endCall = useCallback(() => hangUp(null), [hangUp]);

  const toggleMute = useCallback(() => {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, [localStream]);

  const attachSignalingListeners = useCallback(
    (socket) =>
      bindCallListeners(
        {
          onInvite: ({ fromEmail, callId, ticketId, callerName }) => {
            if (statusRef.current !== CALL_STATUS.IDLE) {
              if (callId !== callIdRef.current && callId !== ringingCallIdRef.current) {
                emitBusy({ toEmail: fromEmail, callId });
              }
              return;
            }
            ringingCallIdRef.current = callId;
            setIncomingCall((prev) => ({
              ...(prev && prev.callId === callId ? prev : {}),
              fromEmail,
              callId,
              ticketId,
              callerName,
            }));
            setStatusSafe(CALL_STATUS.RINGING_INCOMING);
            armTimeout(RING_TIMEOUT_MS + 5000, () => {
              if (statusRef.current === CALL_STATUS.RINGING_INCOMING) cleanup(END_REASON.NO_ANSWER);
            });
          },
          onOffer: ({ fromEmail, callId, sdp }) => {
            if (callIdRef.current && callIdRef.current !== callId) return;
            if (ringingCallIdRef.current && ringingCallIdRef.current !== callId) return;
            setIncomingCall((prev) =>
              prev && prev.callId === callId
                ? { ...prev, offerSdp: sdp }
                : { fromEmail, callId, offerSdp: sdp }
            );
          },
          onAnswer: async ({ callId, sdp }) => {
            const pc = pcRef.current;
            if (callIdRef.current !== callId || !pc || pc.remoteDescription) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              await flushCandidates(pc, callId);
              if (statusRef.current !== CALL_STATUS.CONNECTED) {
                setStatusSafe(CALL_STATUS.CONNECTING);
                armConnectTimeout();
              }
            } catch {
              hangUp(END_REASON.NETWORK);
            }
          },
          onIceCandidate: ({ callId, candidate }) => {
            const pc = pcRef.current;
            if (pc && callIdRef.current === callId && pc.remoteDescription) {
              pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
            } else {
              (pendingCandidatesRef.current[callId] ||= []).push(candidate);
            }
          },
          onAccept: ({ callId } = {}) => {
            if (callId && callId !== callIdRef.current) return;
            if (statusRef.current === CALL_STATUS.RINGING_OUTGOING) {
              setStatusSafe(CALL_STATUS.CONNECTING);
              armConnectTimeout();
            }
          },
          onReject: ({ callId } = {}) => {
            if (!callId || callId === callIdRef.current) cleanup(END_REASON.REJECTED);
          },
          onCancel: ({ callId } = {}) => {
            const matches = callId
              ? callId === ringingCallIdRef.current || callId === callIdRef.current
              : statusRef.current === CALL_STATUS.RINGING_INCOMING;
            if (matches) cleanup(END_REASON.NO_ANSWER);
          },
          onEnd: ({ callId } = {}) => {
            if (!callId || callId === callIdRef.current) cleanup(null);
          },
          onBusy: ({ callId } = {}) => {
            if (!callId || callId === callIdRef.current) cleanup(END_REASON.BUSY);
          },
        },
        socket
      ),
    [cleanup, hangUp, setStatusSafe, armTimeout, armConnectTimeout, flushCandidates]
  );

  return {
    status,
    localStream,
    remoteStream,
    isMuted,
    incomingCall,
    endReason,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelOutgoing,
    toggleMute,
    attachSignalingListeners,
  };
}