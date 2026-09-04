// ══════════════════════════════════════════════════
// src/lib/types.ts
// Types mirror the actual flowdex-backend /admin route shapes 1:1.
// Decimal/numeric Postgres columns come back as strings unless the
// route explicitly parseFloat()s them — those fields are typed `Numeric`.
// ══════════════════════════════════════════════════

export type Numeric = string | number;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── CMS ──

export interface CmsBanner {
  id: number;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  image_url_desktop: string | null;
  image_url_mobile: string | null;
  countdown_end: string | null;
  show_countdown: boolean;
  bg_color: string | null;
  bg_style: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsBannerPayload {
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  image_url?: string;
  image_url_desktop?: string;
  image_url_mobile?: string;
  countdown_end?: string;
  show_countdown?: boolean;
  bg_color?: string;
  bg_style?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CmsFaq {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsFaqPayload {
  question: string;
  answer: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CmsBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string;
  author: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsBlogPostPayload {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  cover_image_url?: string;
  category?: string;
  author?: string;
  is_published?: boolean;
}

export type CmsPageContent = Record<string, string>;

export interface CmsMedia {
  id: number;
  name: string;
  type: string;
  url: string;
  alt_text: string | null;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CmsMediaPayload {
  name: string;
  type: string;
  url: string;
  alt_text?: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CmsTeamMember {
  id: number;
  name: string;
  role: string;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CmsTeamPayload {
  name: string;
  role: string;
  bio?: string;
  photo_url?: string;
  linkedin_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface LoginPayload {
  username: string;
  password: string;
  totp_code: string;
  backup_code?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

// ── Admin users / RBAC ──
// JWT payload is { user_id, username, role, display_name } — none of these
// are in LoginResponse itself, they're decoded client-side from the token
// (see admin-auth-context).
export type AdminRole = 'super_admin' | 'editor' | 'viewer';

export interface AdminUser {
  id: number;
  username: string;
  role: AdminRole;
  display_name: string | null;
  email?: string | null;
  is_active: boolean;
  last_login: string | null;
}

export interface CreateAdminUserPayload {
  username: string;
  password: string;
  role: AdminRole;
  display_name?: string;
  email?: string;
}

export interface CreateAdminUserResponse {
  success: boolean;
  user?: AdminUser;
  // Shown once — the backend never returns this again after creation.
  totp_secret?: string;
  error?: string;
}

export interface UpdateAdminUserPayload {
  role?: AdminRole;
  display_name?: string;
  is_active?: boolean;
  email?: string;
}

export interface Reset2FAResponse {
  success: boolean;
  totp_secret?: string;
  error?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface BackupCodesResponse {
  success: boolean;
  codes: string[];
  error?: string;
}

export interface SendGridSettingsPayload {
  api_key: string;
}

export interface SendGridSettingsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TestEmailPayload {
  to_email: string;
}

export interface TestEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface Tier {
  id: number;
  name: string;
  price: Numeric;
  hard_cap_usd: Numeric;
  total_raised_usd: Numeric;
  is_active: boolean;
  claims_open: boolean;
  tge_percentage: Numeric;
  cliff_months: number;
  vest_months: number;
  opened_at: string | null;
  closed_at: string | null;
}

export interface WebhookHealth {
  last_webhook_at: string;
  minutes_since_last: number;
  webhooks_24h: number;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}

export interface BalanceSnapshot {
  id: number;
  chain: string;
  wallet_address: string;
  on_chain_balance: Numeric;
  expected_balance: Numeric;
  difference: Numeric;
  status: string;
  created_at: string;
}

export interface ReconciliationResult {
  id: number;
  period_start: string;
  period_end: string;
  chain: string;
  total_on_chain_txs: number;
  total_database_records: number;
  matched: number;
  unmatched_incoming: number;
  unmatched_records: number;
  status: 'clean' | 'discrepancies_found' | string;
  discrepancy_details: { unmatched_incoming: string[]; unmatched_records: string[] } | null;
  created_at: string;
}

export interface ReconciliationRunResult {
  chain: string;
  status: string;
  unmatched_incoming: number;
  unmatched_records: number;
}

export interface DashboardData {
  success: boolean;
  total_raised: number;
  // Wallets with at least one CONFIRMED purchase (backend fix, same batch).
  total_buyers: number;
  // Every row in the buyers table, including intent-only/never-paid wallets
  // — informational only, not the headline number.
  total_wallets_connected: number;
  active_tier: Tier | null;
  last_reconciliation: ReconciliationResult | null;
  last_balance_snapshot: BalanceSnapshot | null;
  webhook_health: WebhookHealth;
}

export interface DailyStats {
  date_gmt4: string;
  total_raised_usd?: Numeric;
  total_purchases?: number;
  total_buyers?: number;
  new_buyers?: number;
  tokens_sold?: Numeric;
  tokens_burned?: Numeric;
  message?: string;
}

export interface SupplyStatus {
  total_supply: number;
  presale_max: number;
  allocated_purchases: number;
  allocated_bonuses: number;
  allocated_otc: number;
  total_allocated: number;
  total_burned: number;
  net_outstanding: number;
  remaining_to_allocate: number;
  utilization_pct: string;
}

export interface AdminPurchase {
  id: number;
  buyer_wallet: string;
  tx_hash: string;
  chain: string;
  network_name: string | null;
  crypto_currency: string;
  crypto_amount: Numeric;
  usd_value: Numeric;
  price_at_purchase: Numeric;
  price_source: string | null;
  price_lock_status: string | null;
  tier_at_purchase: number | null;
  tier_name: string | null;
  tier_price: Numeric | null;
  tokens_allocated: Numeric;
  status: string;
  payment_match_status: string | null;
  token_name: string | null;
  contract_address: string | null;
  is_known_token: boolean;
  referred_by_code: string | null;
  buyer_country: string | null;
  buyer_country_code: string | null;
  buyer_state: string | null;
  buyer_city: string | null;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface AdminBuyer {
  buyer_wallet: string;
  referral_code: string;
  referred_by_wallet: string | null;
  referred_by_code: string | null;
  country: string | null;
  country_code: string | null;
  state: string | null;
  city: string | null;
  tag: string | null;
  btc_deposit_address: string | null;
  total_purchases: number;
  total_usd_spent: Numeric;
  total_tokens: Numeric;
  total_referral_purchases: number;
  total_referral_volume_usd: Numeric;
  total_referral_earnings_usd: Numeric;
  total_referral_earnings_tokens: Numeric;
  total_terminal_credits_usd: Numeric;
  total_bonus_tokens: Numeric;
  total_tokens_burned: Numeric;
  created_at: string;
  updated_at: string;
}

export interface AdminReferral {
  id: number;
  referrer_wallet: string;
  referrer_code: string;
  referred_wallet: string;
  referred_by_code: string;
  has_purchased: boolean;
  first_purchase_at: string | null;
  total_purchases: number;
  total_volume_usd: Numeric;
  referrer_bonus_usd: Numeric;
  referrer_terminal_credits: Numeric;
  referrer_bonus_tokens: Numeric;
  status: string;
  created_at: string;
}

export interface TerminalCredit {
  id: number;
  wallet: string;
  amount_usd: Numeric;
  source: string;
  source_purchase_id: number | null;
  remaining_amount: Numeric;
  status: string;
  expires_at: string | null;
  created_at: string;
}

export interface AdminClaim {
  id: number;
  buyer_wallet: string;
  tier_id: number;
  tier_name: string | null;
  total_purchased_tokens: Numeric;
  tge_percentage: Numeric;
  claimable_tokens: Numeric;
  bonus_tokens_claimable: Numeric;
  total_claimable: Numeric;
  status: string;
  claimed_at: string | null;
  created_at: string;
}

export interface ClaimTierStats {
  tier_id: number;
  tier_name: string | null;
  total_claims: Numeric;
  claimed_count: Numeric;
  eligible_count: Numeric;
  total_claimable: Numeric;
  total_claimed: Numeric;
  claim_rate_pct: string;
}

export interface BuyerDetail {
  success: boolean;
  buyer: AdminBuyer;
  purchases: AdminPurchase[];
  referrals: AdminReferral[];
  claims: AdminClaim[];
  terminal_credits: TerminalCredit[];
}

export interface AuditLogEntry {
  id: number;
  event_type: string;
  related_purchase_id: number | null;
  related_wallet: string | null;
  related_tx_hash: string | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  performed_by: string;
  ip_address: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: number;
  tx_hash: string | null;
  chain: string;
  crypto_currency: string;
  crypto_amount: Numeric;
  usd_value: Numeric;
  recipient: string;
  purpose: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface WithdrawalPayload {
  tx_hash?: string;
  chain: string;
  crypto_currency: string;
  crypto_amount: number;
  usd_value: number;
  recipient: string;
  purpose: string;
  notes?: string;
}

export interface CountryStat {
  country: string;
  country_code: string | null;
  buyers: Numeric;
  volume: Numeric;
}

export interface CityStat {
  city: string;
  country: string | null;
  buyers: Numeric;
  volume: Numeric;
}

export interface OtcAllocatePayload {
  investor_name: string;
  investor_wallet: string;
  amount_usd: number;
  payment_reference?: string;
  notes?: string;
}

export interface OtcAllocateResponse {
  success: boolean;
  allocation_id: number;
  tokens: number;
  drip_ends_at: string;
  error?: string;
}

export interface OtcTodayEntry {
  id: number;
  investor_name: string;
  investor_wallet: string;
  allocation: number;
  released: number;
  remaining: number;
  progress: string;
  estimated_completion: string;
}

export interface OtcAllocation {
  id: number;
  investor_name: string;
  investor_wallet: string;
  daily_amount_usd: Numeric;
  total_allocated_usd: Numeric;
  total_tokens_allocated: Numeric;
  tier_at_allocation: number;
  tier_price: Numeric;
  tokens_today: Numeric;
  usd_today: Numeric;
  drip_start_time: string;
  drip_end_time: string;
  drip_released_usd: Numeric;
  drip_status: 'active' | 'paused' | string;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface DisplayOverride {
  key: string;
  value: string;
  is_active: boolean;
  reason: string;
  set_by: string;
  set_at: string;
}

export interface OverridesResponse {
  success: boolean;
  overrides: DisplayOverride[];
  real_data: Tier | null;
}

export interface AdminOverrideLog {
  id: number;
  key: string;
  value: string | null;
  action: 'set' | 'clear';
  reason: string;
  performed_by: string;
  created_at: string;
}

export const OVERRIDE_KEYS = [
  { key: 'raised_override', label: 'Raised Amount' },
  { key: 'progress_bar_override', label: 'Progress %' },
  { key: 'tier_override', label: 'Tier ID' },
  { key: 'price_override', label: 'Price' },
  { key: 'bonus_override', label: 'Bonus Text' },
  { key: 'status_override', label: 'Status Text' },
  { key: 'countdown_override', label: 'Countdown Text' },
] as const;

export interface BurnLogEntry {
  id: number;
  source: string;
  source_id: number | null;
  tokens_burned: Numeric;
  burn_value_usd: Numeric;
  tier_at_burn: number | null;
  tier_price: Numeric;
  reason: string | null;
  created_at: string;
}

export interface BurnsSummary {
  success: boolean;
  total_tokens_burned: number;
  total_burn_value_usd: number;
  recent: BurnLogEntry[];
}

export interface TerminalCreditsSummary {
  success: boolean;
  total_issued_usd: number;
  total_remaining_usd: number;
  recent: TerminalCredit[];
}

export interface FinancialReport {
  generated_at: string;
  summary: {
    total_raised_usd: Numeric;
    total_buyers: number;
    total_purchases: number;
    total_tokens_burned: Numeric;
    total_terminal_credits_issued: Numeric;
    total_otc_allocated: Numeric;
    total_withdrawn: Numeric;
    net_in_treasury: number;
  };
  supply: SupplyStatus;
  tiers: Tier[];
  by_currency: { crypto_currency: string; vol: Numeric; txs: Numeric }[];
  by_country: { buyer_country: string; buyers: Numeric; vol: Numeric }[];
  withdrawals_by_purpose: { purpose: string; total: Numeric }[];
}

export const CHAIN_EXPLORERS: Record<string, (txHash: string) => string> = {
  ethereum: (h) => `https://etherscan.io/tx/${h}`,
  bsc: (h) => `https://bscscan.com/tx/${h}`,
  polygon: (h) => `https://polygonscan.com/tx/${h}`,
  arbitrum: (h) => `https://arbiscan.io/tx/${h}`,
  base: (h) => `https://basescan.org/tx/${h}`,
  tron: (h) => `https://tronscan.org/#/transaction/${h}`,
  solana: (h) => `https://solscan.io/tx/${h}`,
  bitcoin: (h) => `https://mempool.space/tx/${h}`,
};

export const BUYER_TAGS: Record<string, { label: string; tone: 'purple' | 'red' | 'primary' | 'green' }> = {
  whale: { label: 'Whale', tone: 'purple' },
  shark: { label: 'Shark', tone: 'red' },
  dolphin: { label: 'Dolphin', tone: 'primary' },
  fish: { label: 'Fish', tone: 'green' },
};
