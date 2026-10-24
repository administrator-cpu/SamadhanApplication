// src/calls/callAudio.js
import InCallManager from 'react-native-incall-manager';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getTune } from './ringbackTunes';

const RING_VIBRATION = [0, 1000, 1000];

let chain = Promise.resolve();
const run = (fn) => {
  chain = chain.then(fn).catch(() => {});
  return chain;
};

const ringbackMode = (speaker) => ({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  shouldRouteThroughEarpiece: !speaker,
  interruptionMode: 'doNotMix',
  interruptionModeAndroid: 'doNotMix',
  allowsRecording: false,
});

const idleMode = {
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'mixWithOthers',
  interruptionModeAndroid: 'duckOthers',
  allowsRecording: false,
};

let ringbackPlayer = null;
let ringbackTuneId = null;
let ringtoneOn = false;
let sessionOn = false;

async function stopRingbackNow() {
  const player = ringbackPlayer;
  ringbackPlayer = null;
  ringbackTuneId = null;
  if (!player) return;
  try {
    player.pause();
    player.remove();
  } catch {}
  await setAudioModeAsync(idleMode);
}

function stopRingtoneNow() {
  if (!ringtoneOn) return;
  ringtoneOn = false;
  try {
    InCallManager.stopRingtone();
  } catch {}
}

export const callAudio = {
  startRingtone: () =>
    run(async () => {
      if (ringtoneOn) return;
      ringtoneOn = true;
      InCallManager.startRingtone('_DEFAULT_', RING_VIBRATION, 'playback', -1);
    }),

  stopRingtone: () => run(async () => stopRingtoneNow()),

  startRingback: (tuneId, speaker) =>
    run(async () => {
      if (ringbackPlayer && ringbackTuneId === tuneId) return;
      await stopRingbackNow();
      await setAudioModeAsync(ringbackMode(speaker));
      const player = createAudioPlayer(getTune(tuneId).source);
      player.loop = true;
      player.volume = 1;
      ringbackPlayer = player;
      ringbackTuneId = tuneId;
      player.play();
    }),

  startSession: (speaker) =>
    run(async () => {
      stopRingtoneNow();
      await stopRingbackNow();
      if (!sessionOn) {
        InCallManager.start({ media: 'audio', auto: true });
        sessionOn = true;
      }
      InCallManager.setForceSpeakerphoneOn(speaker ? true : null);
    }),

  setSpeaker: (speaker) =>
    run(async () => {
      if (sessionOn) {
        InCallManager.setForceSpeakerphoneOn(speaker ? true : null);
        return;
      }
      if (ringbackPlayer) {
        await setAudioModeAsync(ringbackMode(speaker));
      }
    }),

  stopAll: () =>
    run(async () => {
      stopRingtoneNow();
      await stopRingbackNow();
      if (sessionOn) {
        sessionOn = false;
        InCallManager.setForceSpeakerphoneOn(null);
        InCallManager.stop();
      }
    }),
};
