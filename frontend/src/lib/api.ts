import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let accessToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

function subscribeToRefresh(resolve: (token: string) => void, reject: (err: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}
function notifyRefreshSubscribers(token: string) {
  refreshSubscribers.forEach(s => s.resolve(token));
  refreshSubscribers = [];
}
function rejectRefreshSubscribers(err: unknown) {
  refreshSubscribers.forEach(s => s.reject(err));
  refreshSubscribers = [];
}

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    // Network errors / cancelled requests have no config — nothing to retry.
    if (!originalRequest) return Promise.reject(err);
    // Never attempt a token refresh on auth endpoints — a 401 from /auth/login means
    // wrong credentials, not an expired token. Refreshing would replace the real error
    // with a generic "Необходима авторизация" message and confuse the UI.
    const isAuthEndpoint = /\/auth\/(login|register|refresh)/.test(originalRequest?.url ?? '');
    if (err.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh(
            token => {
              // Mark resumed requests too: if they still 401 after the fresh
              // token, they must reject instead of re-entering the refresh.
              originalRequest._retry = true;
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject
          );
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        const newToken: string = res.data.data.accessToken;
        setAccessToken(newToken);
        notifyRefreshSubscribers(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        rejectRefreshSubscribers(refreshErr);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
