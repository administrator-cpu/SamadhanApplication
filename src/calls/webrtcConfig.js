// src/calls/webrtcConfig.js
import Constants from 'expo-constants';

const turn = Constants.expoConfig?.extra?.turn;

export const RTC_CONFIG = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ...(turn
      ? [{ urls: turn.urls, username: turn.username, credential: turn.credential }]
      : []),
  ],
  iceCandidatePoolSize: 2,
};

export const CALL_STATUS = {
  IDLE: 'idle',
  RINGING_OUTGOING: 'ringing_outgoing',
  RINGING_INCOMING: 'ringing_incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
};