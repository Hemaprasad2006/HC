import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  theme: string;
  remainingFreezes: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  onboardingStep: number;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  updateUser: (updatedFields: Partial<User>) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setOnboardingStep: (step: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  onboardingStep: 1,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  updateUser: (updatedFields) => set((state) => ({
    user: state.user ? { ...state.user, ...updatedFields } : null
  })),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, onboardingStep: 1 });
  },

  setOnboardingStep: (step) => set({ onboardingStep: step }),
}));
