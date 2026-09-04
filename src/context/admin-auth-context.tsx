// ══════════════════════════════════════════════════
// src/context/admin-auth-context.tsx
// Admin session state. Token lives only in React state (memory) —
// never localStorage/sessionStorage — so a hard refresh always requires
// re-authenticating with username + password + TOTP, by design.
// ══════════════════════════════════════════════════

'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { adminLogin, ApiError } from '@/lib/api';
import type { AdminRole, LoginPayload } from '@/lib/types';

// The JWT itself is the source of truth for role/user_id — LoginResponse
// only carries {success, token}. No signature verification here: this is
// purely for UI display/gating decisions, the backend re-checks on every
// request regardless of what the client thinks the role is.
function decodeJwtPayload(token: string): { user_id?: number; username?: string; role?: string } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

interface AdminAuthContextValue {
  token: string | null;
  username: string | null;
  userId: number | null;
  role: AdminRole | null;
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

  const decoded = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);
  const userId = decoded?.user_id ?? null;
  const role = (decoded?.role as AdminRole | undefined) ?? null;

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      token,
      username,
      userId,
      role,
      isAuthenticated: !!token,
      isLoggingIn,
      loginError,
      login,
      logout,
      adminFetch,
    }),
    [token, username, userId, role, isLoggingIn, loginError, login, logout, adminFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
