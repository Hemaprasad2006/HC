import { create } from 'zustand';
import { connectFocusSocket, disconnectFocusSocket, getFocusSocket } from '../lib/socket';
import { playAmbient, stopAmbient } from '../lib/audio';

interface FocusState {
  taskTitle: string;
  mode: 'pomodoro' | 'custom' | 'stopwatch';
  durationMinutes: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'ended';
  currentRound: number;
  totalRounds: number;
  ambientSound: 'none' | 'rain' | 'lofi' | 'forest' | 'cafe';
  
  startFocus: (userId: string, taskTitle: string, mode: 'pomodoro' | 'custom' | 'stopwatch', durationMinutes: number, totalRounds?: number) => void;
  pauseFocus: (userId: string) => void;
  resumeFocus: (userId: string) => void;
  tickFocus: (userId: string, remainingSeconds: number) => void;
  endFocus: (userId: string, actualMinutes: number) => void;
  setAmbientSound: (sound: 'none' | 'rain' | 'lofi' | 'forest' | 'cafe') => void;
  resetTimer: () => void;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  taskTitle: '',
  mode: 'pomodoro',
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  status: 'idle',
  currentRound: 1,
  totalRounds: 4,
  ambientSound: 'none',

  startFocus: (userId, taskTitle, mode, durationMinutes, totalRounds = 4) => {
    const remainingSeconds = durationMinutes * 60;
    set({
      taskTitle,
      mode,
      durationMinutes,
      remainingSeconds,
      status: 'running',
      currentRound: 1,
      totalRounds,
    });

    const socket = connectFocusSocket(userId);
    socket.emit('focus:start', {
      userId,
      taskTitle,
      mode,
      durationMinutes,
    });

    // Start playing ambient audio if chosen
    const sound = get().ambientSound;
    if (sound !== 'none') {
      playAmbient(sound);
    }
  },

  pauseFocus: (userId) => {
    set({ status: 'paused' });
    const socket = getFocusSocket();
    if (socket) {
      socket.emit('focus:pause', {
        userId,
        remainingSeconds: get().remainingSeconds,
      });
    }
    stopAmbient();
  },

  resumeFocus: (userId) => {
    set({ status: 'running' });
    const socket = getFocusSocket();
    if (socket) {
      socket.emit('focus:resume', { userId });
    }
    const sound = get().ambientSound;
    if (sound !== 'none') {
      playAmbient(sound);
    }
  },

  tickFocus: (userId, remainingSeconds) => {
    set({ remainingSeconds });
    const socket = getFocusSocket();
    if (socket) {
      socket.emit('focus:tick', { userId, remainingSeconds });
    }
  },

  endFocus: (userId, actualMinutes) => {
    set({ status: 'ended' });
    const socket = getFocusSocket();
    if (socket) {
      socket.emit('focus:end', {
        userId,
        actualMinutes,
        taskTitle: get().taskTitle,
        mode: get().mode,
      });
    }
    stopAmbient();
    disconnectFocusSocket();
  },

  setAmbientSound: (sound) => {
    set({ ambientSound: sound });
    if (get().status === 'running') {
      if (sound === 'none') {
        stopAmbient();
      } else {
        playAmbient(sound);
      }
    }
  },

  resetTimer: () => {
    set({
      status: 'idle',
      remainingSeconds: get().durationMinutes * 60,
      currentRound: 1,
    });
    stopAmbient();
    disconnectFocusSocket();
  },
}));
