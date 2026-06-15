import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export function useHabits() {
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHabits = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/habits');
      setHabits(data);
    } catch (e) {
      console.error('Error fetching habits:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkIn = useCallback(async (id: string, date: string, note?: string) => {
    try {
      const { data } = await api.post(`/habits/${id}/check-in`, { date, note });
      await fetchHabits();
      return data;
    } catch (e) {
      console.error('Error checking in habit:', e);
      throw e;
    }
  }, [fetchHabits]);

  const addHabit = useCallback(async (habitData: {
    name: string;
    emoji: string;
    color: string;
    category: string;
    frequency: string;
    customDays?: number[];
    reminderTime?: string;
  }) => {
    try {
      const payload = {
        ...habitData,
        customDays: habitData.customDays ? JSON.stringify(habitData.customDays) : '[]',
      };
      const { data } = await api.post('/habits', payload);
      await fetchHabits();
      return data;
    } catch (e) {
      console.error('Error adding habit:', e);
      throw e;
    }
  }, [fetchHabits]);

  const freezeStreak = useCallback(async (id: string, date: string) => {
    try {
      const { data } = await api.post(`/habits/${id}/freeze`, { date });
      await fetchHabits();
      return data;
    } catch (e) {
      console.error('Error freezing habit streak:', e);
      throw e;
    }
  }, [fetchHabits]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return { habits, loading, refetch: fetchHabits, checkIn, addHabit, freezeStreak };
}
export default useHabits;
