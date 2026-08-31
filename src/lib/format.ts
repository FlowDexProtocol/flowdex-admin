// ══════════════════════════════════════════════════
// src/lib/format.ts
// Postgres DECIMAL columns arrive as strings, so every numeric display
// goes through toNum() first.
// ══════════════════════════════════════════════════

import type { Numeric } from './types';

export function toNum(value: Numeric | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function formatUsd(value: Numeric | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(n);
}

export function formatCompactUsd(value: Numeric | null | undefined): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatTokens(value: Numeric | null | undefined, maxDecimals = 2): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals }).format(n);
}

export function formatNumber(value: Numeric | null | undefined, maxDecimals = 4): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDecimals }).format(n);
}

export function formatInt(value: Numeric | null | undefined): string {
  const n = toNum(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

export function formatPct(value: Numeric | null | undefined, decimals = 1): string {
  const n = toNum(value);
  return `${n.toFixed(decimals)}%`;
}

export function formatPrice(value: Numeric | null | undefined, decimals = 4): string {
  const n = toNum(value);
  return `$${n.toFixed(decimals)}`;
}

export function truncateWallet(wallet: string | null | undefined, lead = 6, trail = 4): string {
  if (!wallet) return '';
  if (wallet.length <= lead + trail + 3) return wallet;
  return `${wallet.slice(0, lead)}...${wallet.slice(-trail)}`;
}

// Renders a UTC ISO timestamp in GMT+4 (Asia/Dubai) — the backend's operating timezone.
export function formatDateGmt4(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai',
    timeZoneName: 'short',
  }).format(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
