import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = __DEV__
  ? 'http://10.0.2.2:3000/api'  // Android emulator -> host machine
  : 'https://life-director-prod.com/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT on every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Error fetching token in request interceptor:', e);
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refreshToken');
        if (refresh) {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken: refresh,
          });
          await SecureStore.setItemAsync('accessToken', data.accessToken);
          if (data.refreshToken) {
            await SecureStore.setItemAsync('refreshToken', data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api.request(originalRequest);
        }
      } catch (refreshError) {
        // Clear tokens on failure
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
