import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { BASE_URL } from '../lib/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'habit' | 'water' | 'task' | 'streak' | 'digest';
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addLocalNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
}

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        set({ notifications: data.notifications, unreadCount: data.unreadCount });
      }
    } catch (e) {
      console.error('Error fetching notifications', e);
    } finally {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = get().notifications.map(n => n.id === id ? { ...n, read: true } : n);
        const unread = updated.filter(n => !n.read).length;
        set({ notifications: updated, unreadCount: unread });
      }
    } catch (e) {
      console.error('Error marking read', e);
    }
  },

  markAllRead: async () => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = get().notifications.map(n => ({ ...n, read: true }));
        set({ notifications: updated, unreadCount: 0 });
      }
    } catch (e) {
      console.error('Error marking all read', e);
    }
  },

  deleteNotification: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        const updated = get().notifications.filter(n => n.id !== id);
        const unread = updated.filter(n => !n.read).length;
        set({ notifications: updated, unreadCount: unread });
      }
    } catch (e) {
      console.error('Error deleting notification', e);
    }
  },

  addLocalNotification: (notification) => {
    const localItem: AppNotification = {
      ...notification,
      id: `local-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      notifications: [localItem, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
