// ══════════════════════════════════════════════════
// src/context/admin-auth-context.tsx
// Admin session state.
//
// The token was previously held in memory only, so every refresh meant
// password + TOTP again. That is the safest possible posture and it was
// unusable in practice: an admin reloading a page a dozen times an hour
// was re-authenticating a dozen times an hour.
//
// It now survives a refresh, with two bounds:
//
//   sessionStorage, not localStorage — scoped to the tab and cleared when
//   the browser closes, so a session cannot outlive the window it was
//   opened in.
//
//   A 30-minute idle timeout, refreshed on real interaction. Walk away
//   and the session is gone when you come back.
//
// Worth being clear about what this does not do: the backend issues a
// 24-hour JWT, so anyone who extracts the token from the browser holds a
// working credential for up to 24 hours regardless of what this file
// decides. The idle timeout is a convenience boundary, not a security
// one. Shortening the backend token is the change that would make it a
// security boundary.
// ══════════════════════════════════════════════════

'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminLogin, ApiError } from '@/lib/api';
import type { AdminRole, LoginPayload } from '@/lib/types';

// The JWT itself is the source of truth for role/user_id — LoginResponse
// only carries {success, token}. No signature verification here: this is
// purely for UI display/gating decisions, the backend re-checks on every
// request regardless of what the client thinks the role is.
function decodeJwtPayload(
  token: string
): { user_id?: number; username?: string; role?: string; display_name?: string } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}


// ── Session persistence ──
const STORAGE_KEY = 'flowdex_admin_session';
const IDLE_LIMIT_MS = 30 * 60 * 1000;

// Writing lastSeen on every mousemove would be thousands of writes a
// minute for no benefit; once a minute is enough to track "is someone
// here" against a 30-minute window.
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000;

interface StoredSession {
  token: string;
  username: string;
  lastSeen: number;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.lastSeen) return null;

    if (Date.now() - parsed.lastSeen > IDLE_LIMIT_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // The token's own expiry still wins. A session restored from storage
    // must not outlive the credential it holds.
    const payload = decodeJwtPayload(parsed.token) as unknown as { exp?: number } | null;
    if (payload?.exp && payload.exp * 1000 <= Date.now()) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing and storage-blocked profiles throw here. The session
    // then behaves exactly as it did before: memory only.
  }
}

interface AdminAuthContextValue {
  token: string | null;
  username: string | null;
  displayName: string | null;
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
  // Lazy initialisers so the stored session is read once, on mount, and
  // never during server rendering.
  const [token, setToken] = useState<string | null>(() => readStoredSession()?.token ?? null);
  const [username, setUsername] = useState<string | null>(() => readStoredSession()?.username ?? null);
  // Both initialisers read the same stored value; the second call is
  // cheap and keeps each piece of state independently initialised.
  const lastWriteRef = useRef(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
    writeStoredSession(null);
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
      writeStoredSession({ token: res.token, username: payload.username, lastSeen: Date.now() });
      return true;
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);


  // ── Idle tracking ──
  //
  // Interaction marks the session alive. A timer checks the gap rather
  // than counting down, so a laptop that was asleep for an hour is
  // correctly treated as idle on wake instead of resuming where it left
  // off.
  useEffect(() => {
    if (!token) return;

    const touch = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;
      lastWriteRef.current = now;
      const current = readStoredSession();
      if (current) writeStoredSession({ ...current, lastSeen: now });
    };

    const events: (keyof WindowEventMap)[] = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    // Returning to the tab counts as activity, and is also the moment to
    // check whether the session expired while it was hidden.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!readStoredSession()) logout();
      else touch();
    };
    document.addEventListener('visibilitychange', onVisible);

    const interval = window.setInterval(() => {
      if (!readStoredSession()) logout();
    }, 30 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [token, logout]);

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
  const displayName = decoded?.display_name ?? null;

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      token,
      username,
      displayName,
      userId,
      role,
      isAuthenticated: !!token,
      isLoggingIn,
      loginError,
      login,
      logout,
      adminFetch,
    }),
    [token, username, displayName, userId, role, isLoggingIn, loginError, login, logout, adminFetch]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
