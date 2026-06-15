import { useState, useCallback } from 'react';
import api from '../lib/api';

export function useHealth() {
  const [loading, setLoading] = useState(false);

  const logWater = useCallback(async (amount: number, date?: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/health/water', { amount, date });
      return data;
    } catch (e) {
      console.error('Error logging water:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logSleep = useCallback(async (bedtime: string, wakeTime: string, date?: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/health/sleep', { bedtime, wakeTime, date });
      return data;
    } catch (e) {
      console.error('Error logging sleep:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logSteps = useCallback(async (count: number, date?: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/health/steps', { count, date });
      return data;
    } catch (e) {
      console.error('Error logging steps:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logWeight = useCallback(async (value: number, unit: 'kg' | 'lbs', date?: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/health/weight', { value, unit, date });
      return data;
    } catch (e) {
      console.error('Error logging weight:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWaterToday = useCallback(async () => {
    const { data } = await api.get('/health/water');
    return data;
  }, []);

  const fetchWaterHistory = useCallback(async () => {
    const { data } = await api.get('/health/water/history');
    return data;
  }, []);

  const fetchSleepHistory = useCallback(async () => {
    const { data } = await api.get('/health/sleep');
    return data;
  }, []);

  const fetchSleepStats = useCallback(async () => {
    const { data } = await api.get('/health/sleep/stats');
    return data;
  }, []);

  const fetchStepsToday = useCallback(async () => {
    const { data } = await api.get('/health/steps');
    return data;
  }, []);

  const fetchStepsHistory = useCallback(async () => {
    const { data } = await api.get('/health/steps/history');
    return data;
  }, []);

  const fetchWeightHistory = useCallback(async () => {
    const { data } = await api.get('/health/weight/history');
    return data;
  }, []);

  const fetchBMI = useCallback(async () => {
    const { data } = await api.get('/health/bmi');
    return data;
  }, []);

  const fetchHealthScore = useCallback(async () => {
    const { data } = await api.get('/health/score');
    return data;
  }, []);

  const fetchHealthScoreHistory = useCallback(async () => {
    const { data } = await api.get('/health/score/history');
    return data;
  }, []);

  return {
    loading,
    logWater,
    logSleep,
    logSteps,
    logWeight,
    fetchWaterToday,
    fetchWaterHistory,
    fetchSleepHistory,
    fetchSleepStats,
    fetchStepsToday,
    fetchStepsHistory,
    fetchWeightHistory,
    fetchBMI,
    fetchHealthScore,
    fetchHealthScoreHistory,
  };
}
export default useHealth;
