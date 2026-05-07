/**
 * AudioService — local audio playback for pre-generated Azure TTS files.
 *
 * Workflow:
 *   1. Developer runs `npm run generate-audio` in scripts/ — creates MP3 files and maps.
 *   2. AudioService.init() loads text_map.json (arabic text → key) and the static
 *      AUDIO_REQUIRE_MAP (key → Metro asset module ID).
 *   3. At runtime, play() / playArabic() look up the local module and use expo-av.
 *   4. If a local file is not available, falls back to the backend TTS endpoint.
 *
 * Graceful degradation:
 *   If audio hasn't been generated yet (AUDIO_REQUIRE_MAP is empty), every call
 *   transparently falls back to backend TTS — the app continues to work normally.
 */

import { Audio } from 'expo-av';
import { AUDIO_REQUIRE_MAP } from '../generated/audioRequireMap';

// text_map.json is a small bundled JSON — arabic text → key
// eslint-disable-next-line @typescript-eslint/no-require-imports
let _textMap: Record<string, string> = require('../assets/audio/text_map.json');

const BACKEND_BASE =
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '');

class AudioService {
  private _ready        = false;
  private _current:     Audio.Sound | null = null;
  private _seqAborted   = false;

  /** Call once on app startup from _layout.tsx */
  async init(): Promise<void> {
    try {
      // Refresh text map (may have been updated since bundle)
      _textMap = require('../assets/audio/text_map.json');
    } catch { /* keep default empty map */ }

    this._ready = Object.keys(AUDIO_REQUIRE_MAP).length > 0;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS:    true,
        staysActiveInBackground: false,
      });
    } catch { /* non-critical */ }
  }

  /** Whether local audio files are available */
  isReady(): boolean { return this._ready; }

  /**
   * Returns the Metro require module ID for a given Arabic text string, or null.
   * Use this in components that manage their own sound lifecycle (e.g. lesson screen),
   * so they can keep their existing progress-tracking and ref management.
   */
  getModuleForText(text: string): number | null {
    const key = _textMap[text];
    if (!key) return null;
    const mod = AUDIO_REQUIRE_MAP[key];
    return mod !== undefined ? mod : null;
  }

  /** Returns the Metro module ID for a given key, or null */
  getModule(key: string): number | null {
    const mod = AUDIO_REQUIRE_MAP[key];
    return mod !== undefined ? mod : null;
  }

  // ── High-level play methods ──────────────────────────────────────────────────

  /**
   * Plays audio by key (e.g. 'greetings_001/vocab_c1_0').
   * Falls back to nothing if the key is not in the map.
   */
  async play(key: string, onEnd?: () => void): Promise<void> {
    const mod = AUDIO_REQUIRE_MAP[key];
    if (mod === undefined) {
      console.warn(`[AudioService] No local file for key: ${key}`);
      onEnd?.();
      return;
    }
    await this._playModule(mod, onEnd);
  }

  /**
   * Plays audio for an Arabic text string.
   * Uses a local file when available; falls back to the backend TTS endpoint.
   */
  async playArabic(text: string, onEnd?: () => void): Promise<void> {
    const mod = this.getModuleForText(text);
    if (mod !== null) {
      await this._playModule(mod, onEnd);
    } else {
      await this._playBackendTTS(text, onEnd);
    }
  }

  /** Stop whatever is currently playing */
  async stop(): Promise<void> {
    this._seqAborted = true;
    await this._stopCurrent();
  }

  /**
   * Play an array of keys in sequence; aborts immediately if stop() is called.
   */
  async playSequence(keys: string[], onEnd?: () => void): Promise<void> {
    this._seqAborted = false;
    for (const key of keys) {
      if (this._seqAborted) break;
      await new Promise<void>(resolve => {
        this.play(key, resolve).catch(() => resolve());
      });
    }
    onEnd?.();
  }

  isPlaying(): boolean { return this._current !== null; }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _playModule(moduleId: number, onEnd?: () => void): Promise<void> {
    await this._stopCurrent();
    try {
      const { sound } = await Audio.Sound.createAsync(
        // expo-av accepts a Metro asset module ID directly (same as require())
        moduleId as Parameters<typeof Audio.Sound.createAsync>[0],
        { shouldPlay: true },
        (status: Parameters<Audio.Sound['setOnPlaybackStatusUpdate']>[0] extends ((s: infer S) => void) ? S : never) => {
          if (!(status as { isLoaded: boolean }).isLoaded) return;
          if ((status as { didJustFinish?: boolean }).didJustFinish) {
            this._current = null;
            sound.unloadAsync().catch(() => {});
            onEnd?.();
          }
        },
      );
      this._current = sound;
    } catch (e) {
      console.warn('[AudioService] _playModule failed:', e);
      onEnd?.();
    }
  }

  private async _playBackendTTS(text: string, onEnd?: () => void): Promise<void> {
    const url = `${BACKEND_BASE}/api/tts/synthesize?text=${encodeURIComponent(text)}`;
    await this._stopCurrent();
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (!(status as { isLoaded: boolean }).isLoaded) return;
          if ((status as { didJustFinish?: boolean }).didJustFinish) {
            this._current = null;
            sound.unloadAsync().catch(() => {});
            onEnd?.();
          }
        },
      );
      this._current = sound;
    } catch (e) {
      console.warn('[AudioService] _playBackendTTS failed:', e);
      onEnd?.();
    }
  }

  private async _stopCurrent(): Promise<void> {
    const s = this._current;
    if (s) {
      this._current = null;
      await s.stopAsync().catch(() => {});
      await s.unloadAsync().catch(() => {});
    }
  }
}

/** Singleton — import and call audioService.init() once from _layout.tsx */
export const audioService = new AudioService();
