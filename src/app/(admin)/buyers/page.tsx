'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useDebouncedValue, useFetch } from '@/lib/hooks';
import { exportBuyersCsv, getBuyerDetail, getBuyers, getPurchases } from '@/lib/api';
import { BUYER_TAGS } from '@/lib/types';
import { formatDate, formatTokens, formatUsd, truncateWallet } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  Mono,
  PageHeader,
  Pagination,
  Spinner,
  TableShell,
  td,
  th,
} from '@/components/ui';

function BuyerExpandedPanel({ wallet }: { wallet: string }) {
  const { adminFetch } = useAdminAuth();
  const { data, loading, error } = useFetch(() => adminFetch((t) => getBuyerDetail(t, wallet)), [wallet]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5 text-primary" />
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return null;

  const confirmed = data.purchases.filter((p) => p.status === 'confirmed');
  const tiers = Array.from(new Set(confirmed.map((p) => p.tier_name).filter(Boolean))) as string[];
  const firstBuy = confirmed.length ? confirmed[confirmed.length - 1].created_at : null;
  const lastBuy = confirmed.length ? confirmed[0].created_at : null;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
      <Card>
        <p className="mb-2 text-xs uppercase tracking-widest text-ink-dim">Profile</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">Referral Code</dt>
            <dd>
              <Mono>{data.buyer.referral_code}</Mono>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">Referred By</dt>
            <dd className="text-ink">{data.buyer.referred_by_code || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">Location</dt>
            <dd className="text-right text-ink">{[data.buyer.city, data.buyer.state, data.buyer.country].filter(Boolean).join(', ') || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">Tiers Bought</dt>
            <dd className="text-right text-ink">{tiers.join(', ') || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">First Buy</dt>
            <dd className="text-ink">{formatDate(firstBuy)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-dim">Last Buy</dt>
            <dd className="text-ink">{formatDate(lastBuy)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <p className="mb-2 text-xs uppercase tracking-widest text-ink-dim">Purchases ({data.purchases.length})</p>
        {data.purchases.length === 0 ? (
          <p className="text-sm text-ink-faint">No purchases.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {data.purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-ink-dim">{formatDate(p.created_at)}</span>
                <Mono className="text-ink">{formatUsd(p.usd_value)}</Mono>
                <Badge tone={p.status === 'confirmed' ? 'green' : 'neutral'}>{p.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-xs uppercase tracking-widest text-ink-dim">Referrals ({data.referrals.length}) &amp; Claims ({data.claims.length})</p>
        {data.referrals.length === 0 && data.claims.length === 0 ? (
          <p className="text-sm text-ink-faint">No referrals or claims.</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <Mono className="text-ink-dim">{truncateWallet(r.referred_wallet)}</Mono>
                <Badge tone={r.has_purchased ? 'green' : 'neutral'}>{r.has_purchased ? 'Converted' : 'Pending'}</Badge>
              </div>
            ))}
            {data.claims.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-ink-dim">{c.tier_name || `Tier ${c.tier_id}`}</span>
                <Badge tone={c.status === 'claimed' ? 'green' : 'primary'}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function BuyersPage() {
  const { adminFetch, token } = useAdminAuth();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const { data: result, loading, error } = useFetch(
    () => adminFetch((t) => getBuyers(t, { search: search || undefined, page, limit })),
    [search, page, limit]
  );
  const buyers = result?.data ?? null;

  // Sampled across the 500 most recent purchases (not the current page of
  // buyers) purely to populate the "Tiers*" column preview below.
  const { data: purchasesResult } = useFetch(() => adminFetch((t) => getPurchases(t, { limit: 500 })), []);
  const purchases = purchasesResult?.data;

  const tiersByWallet = useMemo(() => {
    const map = new Map<string, Set<string>>();
    purchases?.forEach((p) => {
      if (!p.tier_name) return;
      if (!map.has(p.buyer_wallet)) map.set(p.buyer_wallet, new Set());
      map.get(p.buyer_wallet)!.add(p.tier_name);
    });
    return map;
  }, [purchases]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportBuyersCsv(token);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Buyer Directory"
        description="All registered buyers, ranked by total spend."
        action={
          <Button variant="secondary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      {exportError && (
        <div className="mb-4">
          <ErrorNote>{exportError}</ErrorNote>
        </div>
      )}

      <div className="mb-6 max-w-sm">
        <div className="relative">
          <Input
            placeholder="Search by wallet address or tag…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setPage(1);
            }}
            className="pr-9"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loading && !buyers ? (
        <LoadingBlock />
      ) : error && !buyers ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !buyers || buyers.length === 0 ? (
        <EmptyState>No buyers match this search.</EmptyState>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Wallet</th>
                <th className={th}>Tag</th>
                <th className={th}>Total Spent</th>
                <th className={th}>Total Tokens</th>
                <th className={th}>Purchases</th>
                <th className={th}>Tiers*</th>
                <th className={th}>Country</th>
                <th className={th}>First Seen</th>
                <th className={th}>Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {buyers.map((b) => {
                const isOpen = expanded === b.buyer_wallet;
                const tagInfo = b.tag ? BUYER_TAGS[b.tag] : null;
                const tiers = Array.from(tiersByWallet.get(b.buyer_wallet) ?? []);
                return (
                  <Fragment key={b.buyer_wallet}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : b.buyer_wallet)}
                      className="cursor-pointer hover:bg-white/5"
                    >
                      <td className={td}>
                        <Mono>{truncateWallet(b.buyer_wallet)}</Mono>
                      </td>
                      <td className={td}>{tagInfo ? <Badge tone={tagInfo.tone}>{tagInfo.label}</Badge> : <span className="text-ink-faint">—</span>}</td>
                      <td className={td}>
                        <Mono>{formatUsd(b.total_usd_spent)}</Mono>
                      </td>
                      <td className={td}>
                        <Mono>{formatTokens(b.total_tokens)}</Mono>
                      </td>
                      <td className={`${td} text-ink-dim`}>{b.total_purchases}</td>
                      <td className={`${td} text-ink-dim`}>{tiers.length ? tiers.join(', ') : '—'}</td>
                      <td className={`${td} text-ink-dim`}>{b.country || '—'}</td>
                      <td className={`${td} text-ink-dim`}>{formatDate(b.created_at)}</td>
                      <td className={`${td} text-ink-dim`}>{formatDate(b.updated_at)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={9} className="bg-bg-soft p-0">
                          <BuyerExpandedPanel wallet={b.buyer_wallet} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </TableShell>
          {result && (
            <Pagination
              page={result.page}
              pages={result.pages}
              total={result.total}
              limit={result.limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
          <p className="mt-3 text-xs text-ink-faint">
            * Tiers is computed from the 500 most recent purchases across all buyers and may be incomplete for the
            longest-running wallets — click a row for that wallet&rsquo;s complete, accurate history.
          </p>
        </>
      )}
    </div>
  );
}
