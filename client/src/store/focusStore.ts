import { create } from 'zustand';

// Web Audio API and Audio Elements state (stored outside Zustand state to prevent React render-loop overhead)
let audioCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let ambientAudio: HTMLAudioElement | null = null;

const soundUrls: Record<string, string> = {
  rain: 'https://assets.mixkit.co/active_storage/sfx/2522/2522-84.wav', // rain loop fallback
  lofi: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // mock lofi track
  forest: 'https://assets.mixkit.co/active_storage/sfx/2437/2437-84.wav', // forest birds
  cafe: 'https://assets.mixkit.co/active_storage/sfx/1084/1084-84.wav', // crowd noise
};

const createWhiteNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
};

const createPinkNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // estimate
    b6 = white * 0.115926;
  }
  return noiseBuffer;
};

const createBrownNoiseBuffer = (ctx: AudioContext) => {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = output[i];
    output[i] *= 3.5; // compensation
  }
  return noiseBuffer;
};

interface FocusState {
  isActive: boolean;
  isPaused: boolean;
  mode: 'pomodoro' | 'custom' | 'stopwatch';
  timeRemaining: number; // in seconds
  duration: number; // in minutes (total session limit)
  taskTitle: string;
  taskId: string | null;
  ambientSound: 'none' | 'white_noise' | 'brown_noise' | 'pink_noise' | 'rain' | 'lofi' | 'forest' | 'cafe';
  volume: number; // 0 to 1
  roundsCount: number;
  completedRounds: number;
  isBreak: boolean;
  isFullscreenLock: boolean;

  startSession: (config: {
    mode: 'pomodoro' | 'custom' | 'stopwatch';
    duration: number;
    taskTitle: string;
    taskId: string | null;
    rounds?: number;
  }) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  tick: () => void;
  endSession: () => void;
  setAmbientSound: (sound: FocusState['ambientSound']) => void;
  setVolume: (volume: number) => void;
  setFullscreenLock: (lock: boolean) => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  isActive: false,
  isPaused: false,
  mode: 'pomodoro',
  timeRemaining: 1500,
  duration: 25,
  taskTitle: '',
  taskId: null,
  ambientSound: 'none',
  volume: 0.5,
  roundsCount: 1,
  completedRounds: 0,
  isBreak: false,
  isFullscreenLock: false,

  startSession: (config) => {
    const initialSeconds = config.mode === 'stopwatch' ? 0 : config.duration * 60;
    
    // Play sound if selected
    get().setAmbientSound(get().ambientSound);

    set({
      isActive: true,
      isPaused: false,
      mode: config.mode,
      duration: config.duration,
      timeRemaining: initialSeconds,
      taskTitle: config.taskTitle,
      taskId: config.taskId,
      roundsCount: config.rounds || 1,
      completedRounds: 0,
      isBreak: false,
    });
  },

  pauseSession: () => {
    if (ambientAudio) ambientAudio.pause();
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
    set({ isPaused: true });
  },

  resumeSession: () => {
    const sound = get().ambientSound;
    if (sound !== 'none') {
      if (['white_noise', 'brown_noise', 'pink_noise'].includes(sound)) {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } else if (ambientAudio) {
        ambientAudio.play().catch(() => {});
      }
    }
    set({ isPaused: false });
  },

  tick: () => {
    const { mode, timeRemaining, isBreak, duration, roundsCount, completedRounds } = get();

    if (mode === 'stopwatch') {
      set({ timeRemaining: timeRemaining + 1 });
      return;
    }

    if (timeRemaining <= 1) {
      // Timer finished!
      // Notification chime
      try {
        const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/911/911-84.wav');
        chime.volume = get().volume;
        chime.play();
      } catch (e) {}

      if (mode === 'pomodoro') {
        if (!isBreak) {
          // Finished work session!
          const nextRounds = completedRounds + 1;
          if (nextRounds >= roundsCount) {
            // Completed all Pomodoro rounds!
            get().endSession();
          } else {
            // Take short break (5 mins)
            set({
              isBreak: true,
              completedRounds: nextRounds,
              timeRemaining: 5 * 60, // 5 min break
            });
          }
        } else {
          // Finished break session, start work session (25 mins)
          set({
            isBreak: false,
            timeRemaining: duration * 60,
          });
        }
      } else {
        // Custom timer complete
        get().endSession();
      }
    } else {
      set({ timeRemaining: timeRemaining - 1 });
    }
  },

  endSession: () => {
    // Stop audio
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio = null;
    }
    if (noiseSource) {
      try { noiseSource.stop(); } catch (e) {}
      noiseSource = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }

    set({
      isActive: false,
      isPaused: false,
      timeRemaining: 1500,
      isBreak: false,
      isFullscreenLock: false,
    });
  },

  setAmbientSound: (sound) => {
    // Stop existing audio sources
    if (ambientAudio) {
      ambientAudio.pause();
      ambientAudio = null;
    }
    if (noiseSource) {
      try { noiseSource.stop(); } catch (e) {}
      noiseSource = null;
    }

    set({ ambientSound: sound });

    if (sound === 'none' || get().isPaused) return;

    const volume = get().volume;

    // 1. Synthesized Noise (Web Audio API)
    if (['white_noise', 'brown_noise', 'pink_noise'].includes(sound)) {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      gainNode = audioCtx.createGain();
      gainNode.gain.value = volume;
      gainNode.connect(audioCtx.destination);

      let buffer;
      if (sound === 'white_noise') buffer = createWhiteNoiseBuffer(audioCtx);
      else if (sound === 'pink_noise') buffer = createPinkNoiseBuffer(audioCtx);
      else buffer = createBrownNoiseBuffer(audioCtx);

      noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      noiseSource.connect(gainNode);
      noiseSource.start(0);
    } 
    // 2. Stream Loops (Rain, Lofi, Forest, Cafe)
    else {
      const url = soundUrls[sound];
      if (url) {
        ambientAudio = new Audio(url);
        ambientAudio.loop = true;
        ambientAudio.volume = volume;
        ambientAudio.play().catch(e => console.log('Audio autoplay blocked or failed', e));
      }
    }
  },

  setVolume: (volume) => {
    set({ volume });
    if (gainNode) {
      gainNode.gain.value = volume;
    }
    if (ambientAudio) {
      ambientAudio.volume = volume;
    }
  },

  setFullscreenLock: (lock) => set({ isFullscreenLock: lock }),
}));
