// src/sockets/callSignaling.js
import { connectSocket, getSocket } from './socketManager';

export const CALL_EVENTS = {
  INVITE: 'call:invite',
  OFFER: 'call:offer',
  ANSWER: 'call:answer',
  ICE_CANDIDATE: 'call:ice-candidate',
  ACCEPT: 'call:accept',
  REJECT: 'call:reject',
  CANCEL: 'call:cancel',
  END: 'call:end',
  BUSY: 'call:busy',
  RINGING: 'call:ringing',
  UNAVAILABLE: 'call:unavailable',
  TUNE_GET: 'call:tune:get',
  TUNE_SET: 'call:tune:set',
};

export function emitInvite({ toEmail, ticketId, callId, callerName }) {
  getSocket()?.emit(CALL_EVENTS.INVITE, { toEmail, ticketId, callId, callerName });
}

export function emitOffer({ toEmail, callId, sdp }) {
  getSocket()?.emit(CALL_EVENTS.OFFER, { toEmail, callId, sdp });
}

export function emitAnswer({ toEmail, callId, sdp }) {
  getSocket()?.emit(CALL_EVENTS.ANSWER, { toEmail, callId, sdp });
}

export function emitIceCandidate({ toEmail, callId, candidate }) {
  getSocket()?.emit(CALL_EVENTS.ICE_CANDIDATE, { toEmail, callId, candidate });
}

export function emitAccept({ toEmail, callId }) {
  getSocket()?.emit(CALL_EVENTS.ACCEPT, { toEmail, callId });
}

export function emitReject({ toEmail, callId }) {
  getSocket()?.emit(CALL_EVENTS.REJECT, { toEmail, callId });
}

export function emitCancel({ toEmail, callId }) {
  getSocket()?.emit(CALL_EVENTS.CANCEL, { toEmail, callId });
}

export function emitEnd({ toEmail, callId }) {
  getSocket()?.emit(CALL_EVENTS.END, { toEmail, callId });
}

export function emitBusy({ toEmail, callId }) {
  getSocket()?.emit(CALL_EVENTS.BUSY, { toEmail, callId });
}

async function connectedSocket(timeoutMs = 6000) {
  const socket = await connectSocket();
  if (!socket) throw new Error('offline');
  if (socket.connected) return socket;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off('connect', ok);
      reject(new Error('offline'));
    }, timeoutMs);
    function ok() {
      clearTimeout(t);
      resolve();
    }
    socket.once('connect', ok);
  });
  return socket;
}

async function request(event, payload) {
  const socket = await connectedSocket();
  const res = await socket.timeout(8000).emitWithAck(event, payload);
  if (!res?.ok) throw new Error(res?.error || 'request_failed');
  return res;
}

export async function fetchRingbackTune() {
  const res = await request(CALL_EVENTS.TUNE_GET, {});
  return res.tune ?? null;
}

export async function saveRingbackTune(tune) {
  const res = await request(CALL_EVENTS.TUNE_SET, { tune });
  return res.tune ?? null;
}

export function bindCallListeners(handlers, socket = getSocket()) {
  if (!socket) return () => {};

  const map = {
    [CALL_EVENTS.INVITE]: handlers.onInvite,
    [CALL_EVENTS.OFFER]: handlers.onOffer,
    [CALL_EVENTS.ANSWER]: handlers.onAnswer,
    [CALL_EVENTS.ICE_CANDIDATE]: handlers.onIceCandidate,
    [CALL_EVENTS.ACCEPT]: handlers.onAccept,
    [CALL_EVENTS.REJECT]: handlers.onReject,
    [CALL_EVENTS.CANCEL]: handlers.onCancel,
    [CALL_EVENTS.END]: handlers.onEnd,
    [CALL_EVENTS.BUSY]: handlers.onBusy,
    [CALL_EVENTS.RINGING]: handlers.onRinging,
    [CALL_EVENTS.UNAVAILABLE]: handlers.onUnavailable,
  };

  Object.entries(map).forEach(([event, fn]) => {
    if (fn) socket.on(event, fn);
  });

  return () => {
    Object.entries(map).forEach(([event, fn]) => {
      if (fn) socket.off(event, fn);
    });
  };
}