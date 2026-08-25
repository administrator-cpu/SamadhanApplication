// src/sockets/callSignaling.js
import { getSocket } from './socketManager';

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
};

export function emitInvite({ toUserId, ticketId, callId, callerName }) {
  getSocket()?.emit(CALL_EVENTS.INVITE, { toUserId, ticketId, callId, callerName });
}

export function emitOffer({ toUserId, callId, sdp }) {
  getSocket()?.emit(CALL_EVENTS.OFFER, { toUserId, callId, sdp });
}

export function emitAnswer({ toUserId, callId, sdp }) {
  getSocket()?.emit(CALL_EVENTS.ANSWER, { toUserId, callId, sdp });
}

export function emitIceCandidate({ toUserId, callId, candidate }) {
  getSocket()?.emit(CALL_EVENTS.ICE_CANDIDATE, { toUserId, callId, candidate });
}

export function emitAccept({ toUserId, callId }) {
  getSocket()?.emit(CALL_EVENTS.ACCEPT, { toUserId, callId });
}

export function emitReject({ toUserId, callId }) {
  getSocket()?.emit(CALL_EVENTS.REJECT, { toUserId, callId });
}

export function emitCancel({ toUserId, callId }) {
  getSocket()?.emit(CALL_EVENTS.CANCEL, { toUserId, callId });
}

export function emitEnd({ toUserId, callId }) {
  getSocket()?.emit(CALL_EVENTS.END, { toUserId, callId });
}

/**
 * Binds all call-related socket listeners at once and returns a single
 * cleanup function. Any handler left undefined in `handlers` is skipped.
 */
export function bindCallListeners(handlers) {
  const socket = getSocket();
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