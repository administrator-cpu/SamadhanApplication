// src/calls/webrtcConfig.js
const TURN_URLS = (process.env.EXPO_PUBLIC_TURN_URLS || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const TURN_SERVER =
  TURN_URLS.length && process.env.EXPO_PUBLIC_TURN_USERNAME && process.env.EXPO_PUBLIC_TURN_CREDENTIAL
    ? [
        {
          urls: TURN_URLS,
          username: process.env.EXPO_PUBLIC_TURN_USERNAME,
          credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
        },
      ]
    : [];

export const RTC_CONFIG = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.cloudflare.com:3478',
      ],
    },
    ...TURN_SERVER,
  ],
  iceCandidatePoolSize: 4,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export const CALL_STATUS = {
  IDLE: 'idle',
  RINGING_OUTGOING: 'ringing_outgoing',
  RINGING_INCOMING: 'ringing_incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
};

export const CONNECT_TIMEOUT_MS = 20000;
export const DISCONNECT_GRACE_MS = 8000;
export const RING_TIMEOUT_MS = 45000;