import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1` : '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    const { refreshToken, setToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) { clearAuth(); return Promise.reject(err); }

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
      const { accessToken: at, refreshToken: rt } = res.data.data;
      setToken(at, rt);
      queue.forEach(cb => cb(at));
      queue = [];
      original.headers.Authorization = `Bearer ${at}`;
      return api(original);
    } catch {
      clearAuth();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
