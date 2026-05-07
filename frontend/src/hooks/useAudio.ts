/**
 * useAudio — hook for playing TTS audio.
 * Uses local pre-generated files via AudioService when available;
 * falls back to the backend TTS endpoint transparently.
 */

import { useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { audioService } from '../services/AudioService';

const BACKEND_BASE =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');

const soundCache = new Map<string, Audio.Sound>();

export function useAudio() {
  const currentSound = useRef<Audio.Sound | null>(null);

  const playTTS = useCallback(async (text: string, voice: 'female' | 'male' = 'female') => {
    try {
      if (currentSound.current) {
        await currentSound.current.stopAsync().catch(() => {});
      }

      // Prefer local pre-generated file
      const localMod = audioService.getModuleForText(text);
      if (localMod !== null) {
        const cacheKey = `local:${text}`;
        let sound = soundCache.get(cacheKey);
        if (!sound) {
          const { sound: s } = await Audio.Sound.createAsync(
            localMod as Parameters<typeof Audio.Sound.createAsync>[0],
          );
          soundCache.set(cacheKey, s);
          sound = s;
        }
        currentSound.current = sound;
        await sound.replayAsync();
        return;
      }

      // Fall back to backend TTS
      const cacheKey = `${voice}:${text}`;
      let sound = soundCache.get(cacheKey);
      if (!sound) {
        const uri = `${BACKEND_BASE}/api/tts/synthesize?text=${encodeURIComponent(text)}&voice=${voice}`;
        const { sound: s } = await Audio.Sound.createAsync({ uri });
        soundCache.set(cacheKey, s);
        sound = s;
      }
      currentSound.current = sound;
      await sound.replayAsync();
    } catch (e) {
      console.warn('[useAudio] playTTS failed:', e);
    }
  }, []);

  const stopAudio = useCallback(async () => {
    if (currentSound.current) {
      await currentSound.current.stopAsync().catch(() => {});
      currentSound.current = null;
    }
  }, []);

  return { playTTS, stopAudio };
}
