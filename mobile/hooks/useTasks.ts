import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export function useTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks');
      setTasks(data);
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = useCallback(async (taskData: {
    title: string;
    description?: string;
    dueDate?: string | null;
    priority?: number;
    project?: string;
    tags?: string[];
  }) => {
    try {
      const payload = {
        ...taskData,
        tags: taskData.tags ? JSON.stringify(taskData.tags) : '[]',
      };
      const { data } = await api.post('/tasks', payload);
      await fetchTasks();
      return data;
    } catch (e) {
      console.error('Error adding task:', e);
      throw e;
    }
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, updateData: any) => {
    try {
      const { data } = await api.patch(`/tasks/${id}`, updateData);
      await fetchTasks();
      return data;
    } catch (e) {
      console.error('Error updating task:', e);
      throw e;
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      await fetchTasks();
    } catch (e) {
      console.error('Error deleting task:', e);
      throw e;
    }
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks, addTask, updateTask, deleteTask };
}
export default useTasks;
