import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, { setAccessToken } from '@/lib/api';

interface User { id: string; email: string; fullName: string; defaultCurrency: string; }

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.post('/auth/refresh').then(res => {
      setAccessToken(res.data.data.accessToken);
      return api.get('/auth/me');
    }).then(res => setUser(res.data.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    const me = await api.get('/auth/me');
    setUser(me.data.data);
  }

  async function register(email: string, password: string, fullName: string) {
    const res = await api.post('/auth/register', { email, password, fullName });
    setAccessToken(res.data.data.accessToken);
    const me = await api.get('/auth/me');
    setUser(me.data.data);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
