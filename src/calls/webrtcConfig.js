// src/calls/webrtcConfig.js
export const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add a TURN server for reliable NAT traversal in production, e.g:
    // { urls: 'turn:your-turn-server:3478', username: 'user', credential: 'pass' },
  ],
};

export const CALL_STATUS = {
  IDLE: 'idle',
  RINGING_OUTGOING: 'ringing_outgoing',
  RINGING_INCOMING: 'ringing_incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
};