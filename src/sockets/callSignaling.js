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