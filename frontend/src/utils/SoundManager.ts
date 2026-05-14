import { Audio } from 'expo-av';

let _correctSound: Audio.Sound | null = null;

async function getCorrectSound(): Promise<Audio.Sound | null> {
  if (_correctSound) return _correctSound;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/correct.mp3'),
      { shouldPlay: false, volume: 0.75 },
    );
    _correctSound = sound;
    return sound;
  } catch {
    return null;
  }
}

// Call once on lesson screen mount to eliminate first-play latency
export async function preloadCorrectSound() {
  await getCorrectSound();
}

export async function playCorrectSound() {
  try {
    const sound = await getCorrectSound();
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Sound instance may have been invalidated — reset so next call reloads it
    _correctSound = null;
  }
}
