import { Audio } from 'expo-av';

const SOUND_FILES = {
  rain: require('../assets/audio/rain.mp3'),
  lofi: require('../assets/audio/lofi.mp3'),
  forest: require('../assets/audio/forest.mp3'),
  cafe: require('../assets/audio/cafe.mp3'),
};

let soundObject: Audio.Sound | null = null;

export async function playAmbient(type: keyof typeof SOUND_FILES) {
  try {
    await stopAmbient();
    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[type], {
      isLooping: true,
      volume: 0.6,
    });
    soundObject = sound;
    await sound.playAsync();
    console.log(`[Ambient Player] Started looping ${type}`);
  } catch (e) {
    console.warn(`[Ambient Player] Error playing ${type}:`, e);
  }
}

export async function stopAmbient() {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
      console.log('[Ambient Player] Stopped current audio');
    }
  } catch (e) {
    console.warn('[Ambient Player] Error stopping audio:', e);
  }
}
