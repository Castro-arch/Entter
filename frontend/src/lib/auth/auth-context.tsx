'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  type LoginInput,
  type RegisterInput,
  type User,
} from '@/lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Resolve the session once on mount by asking the API who we are. A 401 (or
  // any failure) simply means there is no active session.
  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then(({ user }) => {
        if (!active) return;
        setUser(user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { user } = await authApi.login(input);
    setUser(user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await authApi.register(input);
    setUser(user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
