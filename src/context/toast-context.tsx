// ══════════════════════════════════════════════════
// src/context/toast-context.tsx
// Lightweight success/error toast notifications for CMS (and any other)
// admin actions. No external dependency — a fixed-position stack that
// auto-dismisses.
// ══════════════════════════════════════════════════

'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, message: string) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): { showToast: (type: ToastType, message: string) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return { showToast: ctx.showToast };
}

export function useToastList(): { toasts: Toast[]; dismissToast: (id: number) => void } {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastList must be used within a ToastProvider');
  return { toasts: ctx.toasts, dismissToast: ctx.dismissToast };
}
