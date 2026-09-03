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
  BackupCodesResponse,
  BurnsSummary,
  BuyerDetail,
  ChangePasswordPayload,
  ChangePasswordResponse,
  CityStat,
  ClaimTierStats,
  CmsBanner,
  CmsBannerPayload,
  CmsBlogPost,
  CmsBlogPostPayload,
  CmsFaq,
  CmsFaqPayload,
  CmsMedia,
  CmsMediaPayload,
  CmsPageContent,
  CmsTeamMember,
  CmsTeamPayload,
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
  PaginatedResponse,
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
export const adminChangePassword = (token: string, payload: ChangePasswordPayload) =>
  request<ChangePasswordResponse>('/admin/change-password', { method: 'POST', body: payload, token });
export const adminGenerateBackupCodes = (token: string) =>
  request<BackupCodesResponse>('/admin/2fa/generate-backup-codes', { method: 'POST', token });

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
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: string | number | undefined;
}
export const getPurchases = (token: string, filters: PurchaseFilters = {}) =>
  request<PaginatedResponse<AdminPurchase>>('/admin/purchases', { token, query: filters });
export const exportPurchasesCsv = (token: string) =>
  downloadCsv('/admin/purchases/export/csv', token, `flowdex_purchases_${new Date().toISOString().split('T')[0]}.csv`);

// ── Buyers ──
export interface BuyerFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: string | number | undefined;
}
export const getBuyers = (token: string, filters: BuyerFilters = {}) =>
  request<PaginatedResponse<AdminBuyer>>('/admin/buyers', { token, query: filters });
export const getBuyerDetail = (token: string, wallet: string) => request<BuyerDetail>(`/admin/buyer/${wallet}`, { token });
export const exportBuyersCsv = (token: string) =>
  downloadCsv('/admin/buyers/export/csv', token, `flowdex_buyers_${new Date().toISOString().split('T')[0]}.csv`);

// ── Tiers ──
export const getAdminTiers = (token: string) => request<Tier[]>('/admin/tiers', { token });

// ── Referrals ──
export interface ReferralFilters {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: string | number | undefined;
}
export const getAdminReferrals = (token: string, filters: ReferralFilters = {}) =>
  request<PaginatedResponse<AdminReferral>>('/admin/referrals', { token, query: filters });
export const getTerminalCredits = (token: string) => request<TerminalCreditsSummary>('/admin/terminal-credits', { token });
export const getBurns = (token: string) => request<BurnsSummary>('/admin/burns', { token });
export const exportReferralsCsv = (token: string) =>
  downloadCsv('/admin/referrals/export/csv', token, `flowdex_referrals_${new Date().toISOString().split('T')[0]}.csv`);

// ── Claims ──
export interface ClaimFilters {
  tier?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: string | number | undefined;
}
export const getAdminClaims = (token: string, filters: ClaimFilters = {}) =>
  request<PaginatedResponse<AdminClaim>>('/admin/claims', { token, query: filters });
export const getClaimStats = (token: string) => request<ClaimTierStats[]>('/admin/claims/stats', { token });
export const exportClaimsCsv = (token: string) =>
  downloadCsv('/admin/claims/export/csv', token, `flowdex_claims_${new Date().toISOString().split('T')[0]}.csv`);

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
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: string | number | undefined;
}
export const getAuditLog = (token: string, filters: AuditFilters = {}) =>
  request<PaginatedResponse<AuditLogEntry>>('/admin/audit-log', { token, query: filters });
export const getRecentAuditLog = (token: string, limit = 10) =>
  request<PaginatedResponse<AuditLogEntry>>('/admin/audit-log', { token, query: { limit } });
export const exportAuditLogCsv = (token: string) =>
  downloadCsv('/admin/audit-log/export/csv', token, `flowdex_audit_log_${new Date().toISOString().split('T')[0]}.csv`);

// ── Reports ──
export const getFinancialReport = (token: string) => request<FinancialReport>('/admin/report/financial', { token });

// ── CMS: Banners ──
export const getCmsBanners = (token: string) => request<CmsBanner[]>('/admin/cms/banners', { token });
export const createCmsBanner = (token: string, payload: CmsBannerPayload) =>
  request<{ success: boolean; banner: CmsBanner }>('/admin/cms/banners', { method: 'POST', body: payload, token });
export const updateCmsBanner = (token: string, id: number, payload: Partial<CmsBannerPayload>) =>
  request<{ success: boolean; banner: CmsBanner }>(`/admin/cms/banners/${id}`, { method: 'PUT', body: payload, token });
export const deleteCmsBanner = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/cms/banners/${id}`, { method: 'DELETE', token });
export const reorderCmsBanners = (token: string, ids: number[]) =>
  request<{ success: boolean; order: number[] }>('/admin/cms/banners/reorder', { method: 'POST', body: { ids }, token });

// ── CMS: FAQs ──
export const getCmsFaqsAdmin = (token: string) => request<CmsFaq[]>('/admin/cms/faqs', { token });
export const createCmsFaq = (token: string, payload: CmsFaqPayload) =>
  request<{ success: boolean; faq: CmsFaq }>('/admin/cms/faqs', { method: 'POST', body: payload, token });
export const updateCmsFaq = (token: string, id: number, payload: Partial<CmsFaqPayload>) =>
  request<{ success: boolean; faq: CmsFaq }>(`/admin/cms/faqs/${id}`, { method: 'PUT', body: payload, token });
export const deleteCmsFaq = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/cms/faqs/${id}`, { method: 'DELETE', token });
export const reorderCmsFaqs = (token: string, ids: number[]) =>
  request<{ success: boolean; order: number[] }>('/admin/cms/faqs/reorder', { method: 'POST', body: { ids }, token });

// ── CMS: Blog ──
export const getCmsBlogAdmin = (token: string) => request<CmsBlogPost[]>('/admin/cms/blog', { token });
export const createCmsBlogPost = (token: string, payload: CmsBlogPostPayload) =>
  request<{ success: boolean; post: CmsBlogPost }>('/admin/cms/blog', { method: 'POST', body: payload, token });
export const updateCmsBlogPost = (token: string, id: number, payload: Partial<CmsBlogPostPayload>) =>
  request<{ success: boolean; post: CmsBlogPost }>(`/admin/cms/blog/${id}`, { method: 'PUT', body: payload, token });
export const deleteCmsBlogPost = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/cms/blog/${id}`, { method: 'DELETE', token });
export const publishCmsBlogPost = (token: string, id: number) =>
  request<{ success: boolean; post: CmsBlogPost }>(`/admin/cms/blog/${id}/publish`, { method: 'POST', token });
export const unpublishCmsBlogPost = (token: string, id: number) =>
  request<{ success: boolean; post: CmsBlogPost }>(`/admin/cms/blog/${id}/unpublish`, { method: 'POST', token });

// ── CMS: Page Content ──
export const getCmsPages = (token: string) => request<string[]>('/admin/cms/pages', { token });
export const getCmsPageContent = (token: string, page: string) => request<CmsPageContent>(`/admin/cms/page/${page}`, { token });
export const setCmsPageField = (token: string, page: string, section: string, field: string, value: string) =>
  request<{ success: boolean; content: { page: string; section: string; field: string; value: string } }>(
    `/admin/cms/page/${page}/${section}/${field}`,
    { method: 'PUT', body: { value }, token }
  );

// ── CMS: Media ──
export const getCmsMedia = (token: string) => request<CmsMedia[]>('/admin/cms/media', { token });
export const createCmsMedia = (token: string, payload: CmsMediaPayload) =>
  request<{ success: boolean; media: CmsMedia }>('/admin/cms/media', { method: 'POST', body: payload, token });
export const deleteCmsMedia = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/cms/media/${id}`, { method: 'DELETE', token });

// ── CMS: Team ──
export const getCmsTeam = (token: string) => request<CmsTeamMember[]>('/admin/cms/team', { token });
export const createCmsTeamMember = (token: string, payload: CmsTeamPayload) =>
  request<{ success: boolean; member: CmsTeamMember }>('/admin/cms/team', { method: 'POST', body: payload, token });
export const updateCmsTeamMember = (token: string, id: number, payload: Partial<CmsTeamPayload>) =>
  request<{ success: boolean; member: CmsTeamMember }>(`/admin/cms/team/${id}`, { method: 'PUT', body: payload, token });
export const deleteCmsTeamMember = (token: string, id: number) =>
  request<{ success: boolean }>(`/admin/cms/team/${id}`, { method: 'DELETE', token });
export const reorderCmsTeam = (token: string, ids: number[]) =>
  request<{ success: boolean; order: number[] }>('/admin/cms/team/reorder', { method: 'POST', body: { ids }, token });
