// src/components/calls/CallerTuneCard.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Music2, Play, Square, Check } from 'lucide-react-native';
import { RINGBACK_TUNES, DEFAULT_TUNE } from '@/calls/ringbackTunes';
import { fetchRingbackTune, saveRingbackTune } from '@/sockets/callSignaling';

const QUERY_KEY = ['ringbackTune'];
const PREVIEW_MS = 9000;

function usePreview() {
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const p = playerRef.current;
    playerRef.current = null;
    if (p) {
      try {
        p.pause();
        p.remove();
      } catch {}
    }
    setPlayingId(null);
  };

  const play = async (tune) => {
    stop();
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'duckOthers',
        interruptionModeAndroid: 'duckOthers',
        allowsRecording: false,
      });
      const p = createAudioPlayer(tune.source);
      p.loop = true;
      playerRef.current = p;
      setPlayingId(tune.id);
      p.play();
      timerRef.current = setTimeout(stop, PREVIEW_MS);
    } catch {
      stop();
    }
  };

  useEffect(() => stop, []);

  return { playingId, play, stop };
}

function TuneRow({ tune, selected, playing, onSelect, onTogglePreview, isLast }) {
  return (
    <View className={`flex-row items-center py-3 ${isLast ? '' : 'border-b border-border'}`}>
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.7}
        className="flex-1 flex-row items-center"
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? 'border-primary-700 bg-primary-700' : 'border-border-strong bg-surface'
          }`}
        >
          {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-sans-semibold text-sm text-text-primary">{tune.name}</Text>
          <Text className="font-sans text-xs text-text-tertiary">{tune.description}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTogglePreview}
        activeOpacity={0.8}
        className={`h-9 w-9 items-center justify-center rounded-full ${
          playing ? 'bg-primary-700' : 'bg-surface-sunken'
        }`}
        accessibilityLabel={playing ? `Stop ${tune.name}` : `Preview ${tune.name}`}
      >
        {playing ? (
          <Square size={13} color="#FFFFFF" fill="#FFFFFF" />
        ) : (
          <Play size={14} color="#5C5348" fill="#5C5348" />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CallerTuneCard() {
  const queryClient = useQueryClient();
  const { playingId, play, stop } = usePreview();
  const [error, setError] = useState(null);

  const { data: current, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRingbackTune,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: saveRingbackTune,
    onMutate: async (tune) => {
      setError(null);
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData(QUERY_KEY);
      queryClient.setQueryData(QUERY_KEY, tune);
      return { prev };
    },
    onError: (_err, _tune, ctx) => {
      queryClient.setQueryData(QUERY_KEY, ctx?.prev ?? null);
      setError("Couldn't save your caller tune. Check your connection and try again.");
    },
  });

  const selectedId = current || DEFAULT_TUNE;

  return (
    <View className="rounded-lg border border-border bg-surface px-4 pt-4 pb-1">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-md bg-primary-50">
          <Music2 size={18} color="#B8300F" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-sans-semibold text-base text-text-primary">Caller tune</Text>
          <Text className="font-sans text-xs text-text-secondary">
            What people hear while your phone rings
          </Text>
        </View>
        {isLoading || mutation.isPending ? <ActivityIndicator size="small" color="#948A7C" /> : null}
      </View>

      <View className="mt-2">
        {RINGBACK_TUNES.map((tune, i) => (
          <TuneRow
            key={tune.id}
            tune={tune}
            isLast={i === RINGBACK_TUNES.length - 1}
            selected={selectedId === tune.id}
            playing={playingId === tune.id}
            onSelect={() => {
              if (tune.id !== selectedId) mutation.mutate(tune.id);
            }}
            onTogglePreview={() => (playingId === tune.id ? stop() : play(tune))}
          />
        ))}
      </View>

      {error ? (
        <View className="mb-3 rounded-md bg-error-bg px-3 py-2">
          <Text className="font-sans text-xs text-error-text">{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
