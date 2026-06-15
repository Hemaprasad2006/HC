import { create } from 'zustand';
import storage from '../lib/storage';

interface ThemeState {
  theme: 'light' | 'dark';
  loadTheme: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark', // default Space theme

  loadTheme: async () => {
    const saved = await storage.get('theme');
    if (saved === 'light' || saved === 'dark') {
      set({ theme: saved });
    }
  },

  setTheme: async (theme) => {
    await storage.set('theme', theme);
    set({ theme });
  },
}));
