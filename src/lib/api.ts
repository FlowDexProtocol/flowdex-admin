// ══════════════════════════════════════════════════
// src/lib/api.ts
// Thin client for the flowdex-backend /admin API.
// Paths and payload shapes are matched 1:1 against the backend routes.
// ══════════════════════════════════════════════════

import type {
  AdminBuyer,
  AdminClaim,
  AdminOverrideLog,
  AdminPurchase,
  AdminReferral,
  AuditLogEntry,
  BurnsSummary,
  BuyerDetail,
  CityStat,
  ClaimTierStats,
  CountryStat,
  DailyStats,
  DashboardData,
  FinancialReport,
  LoginPayload,
  LoginResponse,
  OtcAllocatePayload,
  OtcAllocateResponse,
  OtcAllocation,
  OtcTodayEntry,
  OverridesResponse,
  ReconciliationResult,
  ReconciliationRunResult,
  SupplyStatus,
  TerminalCreditsSummary,
  Tier,
  Withdrawal,
  WithdrawalPayload,
} from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.flowdexprotocol.com').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | number | undefined>;
}

function buildQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, { method = 'GET', body, token, query }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Network error — could not reach the FlowDex API.', 0);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const payload = (data ?? {}) as { error?: string; message?: string; code?: string };
    throw new ApiError(payload.error || payload.message || `Request failed (${res.status})`, res.status, payload.code, data);
  }

  return data as T;
}

// Downloads an authenticated CSV response as a file in the browser.
export async function downloadCsv(path: string, token: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // response wasn't JSON — keep default message
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Auth ──
export const adminLogin = (payload: LoginPayload) => request<LoginResponse>('/admin/login', { method: 'POST', body: payload });

// ── Dashboard ──
export const getDashboard = (token: string) => request<DashboardData>('/admin/dashboard', { token });
export const getSupply = (token: string) => request<SupplyStatus>('/admin/supply', { token });
export const getPublicDailyStats = () => request<DailyStats>('/api/stats/daily');

// ── Purchases ──
export interface PurchaseFilters {
  tier?: string;
  currency?: string;
  status?: string;
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}
export const getPurchases = (token: string, filters: PurchaseFilters = {}) =>
  request<AdminPurchase[]>('/admin/purchases', { token, query: filters });

// ── Buyers ──
export const getBuyers = (token: string) => request<AdminBuyer[]>('/admin/buyers', { token });
export const getBuyerDetail = (token: string, wallet: string) => request<BuyerDetail>(`/admin/buyer/${wallet}`, { token });

// ── Tiers ──
export const getAdminTiers = (token: string) => request<Tier[]>('/admin/tiers', { token });

// ── Referrals ──
export const getAdminReferrals = (token: string) => request<AdminReferral[]>('/admin/referrals', { token });
export const getTerminalCredits = (token: string) => request<TerminalCreditsSummary>('/admin/terminal-credits', { token });
export const getBurns = (token: string) => request<BurnsSummary>('/admin/burns', { token });

// ── Claims ──
export interface ClaimFilters {
  tier?: string;
  status?: string;
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}
export const getAdminClaims = (token: string, filters: ClaimFilters = {}) =>
  request<AdminClaim[]>('/admin/claims', { token, query: filters });
export const getClaimStats = (token: string) => request<ClaimTierStats[]>('/admin/claims/stats', { token });

// ── OTC ──
export const postOtcAllocate = (token: string, payload: OtcAllocatePayload) =>
  request<OtcAllocateResponse>('/admin/otc/allocate', { method: 'POST', body: payload, token });
export const getOtcToday = (token: string) => request<OtcTodayEntry[]>('/admin/otc/today', { token });
export const getOtcHistory = (token: string) => request<OtcAllocation[]>('/admin/otc/history', { token });
export const postOtcPause = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/otc/pause/${id}`, { method: 'POST', token });
export const postOtcResume = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/otc/resume/${id}`, { method: 'POST', token });

// ── Display Overrides ──
export const getOverrides = (token: string) => request<OverridesResponse>('/admin/overrides', { token });
export const postOverrideSet = (token: string, payload: { key: string; value: string; reason: string }) =>
  request<{ success: boolean; key: string; value: string }>('/admin/overrides/set', { method: 'POST', body: payload, token });
export const postOverrideClear = (token: string, key: string, reason: string) =>
  request<{ success: boolean; key: string; cleared: boolean }>(`/admin/overrides/clear/${key}`, {
    method: 'POST',
    body: { reason },
    token,
  });
export const getOverridesHistory = (token: string) => request<AdminOverrideLog[]>('/admin/overrides/history', { token });

// ── Reconciliation ──
export const getReconciliation = (token: string) => request<ReconciliationResult[]>('/admin/reconciliation', { token });
export const postReconciliationRun = (token: string) =>
  request<{ success: boolean; results: ReconciliationRunResult[] }>('/admin/reconciliation/run', { method: 'POST', token });

// ── Withdrawals ──
export const getWithdrawals = (token: string) => request<Withdrawal[]>('/admin/withdrawals', { token });
export const postWithdrawal = (token: string, payload: WithdrawalPayload) =>
  request<{ success: boolean; withdrawal_id: number }>('/admin/withdrawals', { method: 'POST', body: payload, token });

// ── Geo ──
export const getStatsByCountry = (token: string) => request<CountryStat[]>('/admin/stats/by-country', { token });
export const getStatsByCity = (token: string) => request<CityStat[]>('/admin/stats/by-city', { token });

// ── Audit Log ──
export interface AuditFilters {
  event_type?: string;
  wallet?: string;
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}
export const getAuditLog = (token: string, filters: AuditFilters = {}) =>
  request<AuditLogEntry[]>('/admin/audit-log', { token, query: filters });

// ── Reports ──
export const getFinancialReport = (token: string) => request<FinancialReport>('/admin/report/financial', { token });
