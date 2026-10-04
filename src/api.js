import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;
export const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

const getTokens = () => ({
  access: localStorage.getItem('access_token'),
  refresh: localStorage.getItem('refresh_token'),
});

export function storeTokens(tokens = {}) {
  if (tokens.access_token) localStorage.setItem('access_token', tokens.access_token);
  if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

api.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshRequest;
api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config;
  const refresh = getTokens().refresh;
  if (error.response?.status !== 401 || !original || original._retried || !refresh || original.url?.includes('/api/auth/')) {
    return Promise.reject(error);
  }
  original._retried = true;
  try {
    refreshRequest ??= axios.post(`${baseURL}/api/auth/refresh`, { refresh_token: refresh });
    const { data } = await refreshRequest;
    storeTokens(data.tokens ?? data);
    refreshRequest = undefined;
    original.headers.Authorization = `Bearer ${getTokens().access}`;
    return api(original);
  } catch (refreshError) {
    refreshRequest = undefined;
    clearTokens();
    window.dispatchEvent(new Event('session-expired'));
    return Promise.reject(refreshError);
  }
});

export function apiError(error) {
  const payload = error.response?.data;
  if (payload?.errors && typeof payload.errors === 'object') return Object.values(payload.errors).flat().join(' ');
  return payload?.message || error.message || 'Something went wrong. Please try again.';
}
