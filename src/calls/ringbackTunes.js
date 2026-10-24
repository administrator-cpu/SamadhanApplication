// src/calls/ringbackTunes.js
export const DEFAULT_TUNE = 'classic';

export const RINGBACK_TUNES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The familiar double ring',
    source: require('../../assets/sounds/ringback/classic.mp3'),
  },
  {
    id: 'chime',
    name: 'Soft chime',
    description: 'Light bells, gently rising',
    source: require('../../assets/sounds/ringback/chime.mp3'),
  },
  {
    id: 'meadow',
    name: 'Meadow',
    description: 'A slow wooden melody',
    source: require('../../assets/sounds/ringback/meadow.mp3'),
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Warm, unhurried chords',
    source: require('../../assets/sounds/ringback/calm.mp3'),
  },
];

export function getTune(id) {
  return RINGBACK_TUNES.find((t) => t.id === id) ?? RINGBACK_TUNES[0];
}
