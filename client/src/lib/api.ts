import { useAuthStore } from '../store/authStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

export const request = async (endpoint: string, options: RequestOptions = {}) => {
  const token = useAuthStore.getState().accessToken;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401 && useAuthStore.getState().isAuthenticated) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      (config.headers as any)['Authorization'] = `Bearer ${newToken}`;
      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, config);
      return handleResponse(retryResponse);
    } else {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }
  }

  return handleResponse(response);
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = 'Something went wrong';
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const attemptRefresh = async (): Promise<boolean> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return true;
    }
  } catch (e) {}

  return false;
};
