/**
 * useAudio — hook for playing TTS audio
 * Uses Expo AV for audio playback
 * Caches loaded sounds in memory
 */

import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { api } from '../services/api';

const soundCache = new Map<string, Audio.Sound>();

export function useAudio() {
  const currentSound = useRef<Audio.Sound | null>(null);

  const playTTS = useCallback(async (text: string, voice: 'female' | 'male' = 'female') => {
    try {
      // Stop any currently playing audio
      if (currentSound.current) {
        await currentSound.current.stopAsync();
      }

      // Check cache
      const cacheKey = `${voice}:${text}`;
      let sound = soundCache.get(cacheKey);

      if (!sound) {
        const uri = api.tts.getAudioUrl(text, voice);
        const { sound: newSound } = await Audio.Sound.createAsync({ uri });
        soundCache.set(cacheKey, newSound);
        sound = newSound;
      }

      currentSound.current = sound;
      await sound.replayAsync();
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (currentSound.current) {
      await currentSound.current.stopAsync();
      currentSound.current = null;
    }
  }, []);

  return { playTTS, stopAudio };
}
