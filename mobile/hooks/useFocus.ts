import { useState, useCallback } from 'react';
import api from '../lib/api';

export function useFocus() {
  const [loading, setLoading] = useState(false);

  const logSession = useCallback(async (sessionData: {
    taskId?: string | null;
    taskTitle?: string | null;
    duration: number;
    mode?: string;
    rounds?: number;
  }) => {
    setLoading(true);
    try {
      const { data } = await api.post('/focus/sessions', sessionData);
      return data;
    } catch (e) {
      console.error('Error logging focus session:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const { data } = await api.get('/focus/stats');
    return data;
  }, []);

  const fetchSessions = useCallback(async (page = 1, limit = 20) => {
    const { data } = await api.get(`/focus/focus/sessions?page=${page}&limit=${limit}`); // wait, in backend app.ts it's mounted on /api/focus, so it's /api/focus/sessions. In our api Axios client, baseURL is /api. So api.get('/focus/sessions') is correct!
    return data;
  }, []);

  // Correct URL path for focus sessions in api config
  const fetchSessionsCorrect = useCallback(async (page = 1, limit = 20) => {
    const { data } = await api.get(`/focus/sessions?page=${page}&limit=${limit}`);
    return data;
  }, []);

  return { loading, logSession, fetchStats, fetchSessions: fetchSessionsCorrect };
}
export default useFocus;
