import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  theme: string;
  height?: number | null;
  focusGoal: number;
  waterGoal: number;
  sleepGoal: number;
  stepGoal: number;
  remainingFreezes: number;
  lastFreezeReplenish: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (user, accessToken, refreshToken) => {
    try {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    } catch (e) {
      console.error('Error saving tokens:', e);
    }
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (e) {
      console.error('Error deleting tokens:', e);
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      
      if (accessToken && refreshToken) {
        try {
          const { data } = await api.get('/user/profile');
          set({ user: data, accessToken, refreshToken, isAuthenticated: true });
        } catch (e) {
          // Token expired or invalid
          try {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
          } catch (e2) {}
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      } else {
        set({ isAuthenticated: false });
      }
    } catch (e) {
      console.error('Error loading session:', e);
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: (updatedUser) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updatedUser } as User : null,
    }));
  },
}));
