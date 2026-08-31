// ══════════════════════════════════════════════════
// src/context/admin-auth-context.tsx
// Admin session state. Token lives only in React state (memory) —
// never localStorage/sessionStorage — so a hard refresh always requires
// re-authenticating with username + password + TOTP, by design.
// ══════════════════════════════════════════════════

'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { adminLogin, ApiError } from '@/lib/api';
import type { LoginPayload } from '@/lib/types';

interface AdminAuthContextValue {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => void;
  adminFetch: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<boolean> => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await adminLogin(payload);
      if (!res.success || !res.token) {
        setLoginError(res.error || 'Login failed');
        return false;
      }
      setToken(res.token);
      setUsername(payload.username);
      return true;
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  // Runs an authenticated request; a 401 (invalid/expired token) forces
  // logout so the layout guard redirects back to /login.
  const adminFetch = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!token) throw new Error('Not authenticated');
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
        throw err;
      }
    },
    [token, logout]
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      token,
      username,
      isAuthenticated: !!token,
      isLoggingIn,
      loginError,
      login,
      logout,
      adminFetch,
    }),
    [token, username, isLoggingIn, loginError, login, logout, adminFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
