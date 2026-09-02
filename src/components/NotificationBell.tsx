'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getRecentAuditLog } from '@/lib/api';
import { formatDateGmt4 } from '@/lib/format';
import type { AuditLogEntry } from '@/lib/types';
import { EmptyState, Spinner } from './ui';

const LAST_SEEN_KEY = 'flowdex-admin-last-seen-audit-id';
const LARGE_PURCHASE_USD = 10000;

function isAlertWorthy(entry: AuditLogEntry): boolean {
  if (entry.event_type === 'purchase_confirmed') {
    const usd = (entry.new_value as { usd_value?: number } | null)?.usd_value;
    if (typeof usd === 'number' && usd > LARGE_PURCHASE_USD) return true;
  }
  return /reconcil|webhook/i.test(entry.event_type);
}

function readLastSeenId(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastSeenId(id: number) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(id));
  } catch {
    // localStorage unavailable — dot just won't persist across reloads
  }
}

export default function NotificationBell() {
  const { adminFetch } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [lastSeenId, setLastSeenId] = useState(readLastSeenId);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: entries, loading } = useFetch(() => adminFetch((token) => getRecentAuditLog(token, 10)), [], 60000);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUnreadAlert = (entries ?? []).some((e) => e.id > lastSeenId && isAlertWorthy(e));

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next && entries && entries.length > 0) {
        const maxId = Math.max(...entries.map((e) => e.id));
        writeLastSeenId(maxId);
        setLastSeenId(maxId);
      }
      return next;
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border text-ink-dim transition-colors hover:border-primary/50 hover:text-primary"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {hasUnreadAlert && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red" />}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-80 rounded-2xl border border-border bg-card p-3 shadow-2xl sm:w-96 sm:max-w-none">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-ink-dim">Recent Alerts</p>
          {loading && !entries ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-5 w-5 text-primary" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <EmptyState>No recent activity.</EmptyState>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {entries.map((e) => (
                <div key={e.id} className="rounded-lg px-2 py-2 hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink">{e.event_type}</span>
                    {isAlertWorthy(e) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red" />}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-faint">{formatDateGmt4(e.created_at)}</p>
                  {e.reason && <p className="mt-0.5 truncate text-xs text-ink-dim">{e.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
