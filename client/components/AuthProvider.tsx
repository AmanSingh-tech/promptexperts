'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearLegacyToken } from '@/lib/api';
import type { MyStats, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  ready: boolean;
  player: MyStats | null;
  refreshPlayer: () => void;
  signIn: (user: User) => void;
  signOut: (redirectTo?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<MyStats | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clearLegacyToken();
    api<{ user: User | null }>('/api/auth/session')
      .then((s) => setUser(s.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const refreshPlayer = useCallback(() => {
    api<MyStats>('/api/me/stats').then(setPlayer).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshPlayer();
    else setPlayer(null);
  }, [user, refreshPlayer]);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('ailogracer:logout', onLogout);
    return () => window.removeEventListener('ailogracer:logout', onLogout);
  }, []);

  const signIn = useCallback((u: User) => setUser(u), []);

  // Full navigation after the server clears the cookie: no route guard can race the redirect,
  // and every piece of per-user client state is dropped.
  const signOut = useCallback(async (redirectTo = '/') => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign(redirectTo);
  }, []);

  return <AuthContext.Provider value={{ user, ready, player, refreshPlayer, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const isStaff = (u: User | null) => u?.role === 'REVIEWER' || u?.role === 'ADMIN';
