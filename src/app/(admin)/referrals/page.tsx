'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useDebouncedValue, useFetch } from '@/lib/hooks';
import { exportReferralsCsv, getAdminReferrals, getBurns, getTerminalCredits } from '@/lib/api';
import { formatDate, formatTokens, formatUsd, toNum, truncateWallet } from '@/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Input,
  LoadingBlock,
  Mono,
  PageHeader,
  Pagination,
  StatCard,
  TableShell,
  td,
  th,
} from '@/components/ui';

export default function ReferralsPage() {
  const { adminFetch, token } = useAdminAuth();

  // Sampled separately at a larger limit purely to rank "Top Referrers" —
  // independent of the paginated raw table below.
  const { data: sampleResult, loading, error } = useFetch(() => adminFetch((t) => getAdminReferrals(t, { limit: 500 })), []);
  const referrals = sampleResult?.data;
  const { data: credits } = useFetch(() => adminFetch((t) => getTerminalCredits(t)), []);
  const { data: burns } = useFetch(() => adminFetch((t) => getBurns(t)), []);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  const { data: tableResult, loading: tableLoading, error: tableError } = useFetch(
    () => adminFetch((t) => getAdminReferrals(t, { search: search || undefined, page, limit })),
    [search, page, limit]
  );
  const tableRows = tableResult?.data ?? null;

  const summary = useMemo(() => {
    if (!referrals) return { total: 0, conversions: 0, volume: 0 };
    return {
      total: sampleResult?.total ?? referrals.length,
      conversions: referrals.filter((r) => r.has_purchased).length,
      volume: referrals.reduce((sum, r) => sum + toNum(r.total_volume_usd), 0),
    };
  }, [referrals, sampleResult]);

  const topReferrers = useMemo(() => {
    if (!referrals) return [];
    const map = new Map<string, { wallet: string; referred: number; converted: number; volume: number; bonus: number }>();
    for (const r of referrals) {
      const entry = map.get(r.referrer_wallet) ?? { wallet: r.referrer_wallet, referred: 0, converted: 0, volume: 0, bonus: 0 };
      entry.referred += 1;
      if (r.has_purchased) entry.converted += 1;
      entry.volume += toNum(r.total_volume_usd);
      entry.bonus += toNum(r.referrer_bonus_usd);
      map.set(r.referrer_wallet, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.volume - a.volume).slice(0, 25);
  }, [referrals]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportReferralsCsv(token);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Referral Dashboard"
        description="Referral performance across the presale."
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

      {loading && !referrals ? (
        <LoadingBlock />
      ) : error && !referrals ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total Referrals" value={summary.total} />
            <StatCard label="Conversions" value={summary.conversions} tone="green" />
            <StatCard label="Referral Volume" value={formatUsd(summary.volume)} tone="primary" />
            <StatCard label="Terminal Credits Issued" value={credits ? formatUsd(credits.total_issued_usd) : '…'} tone="purple" />
            <StatCard label="$FDP Burned" value={burns ? formatTokens(burns.total_tokens_burned) : '…'} tone="red" />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">Top Referrers</h2>
            {topReferrers.length === 0 ? (
              <EmptyState>No referrals yet.</EmptyState>
            ) : (
              <TableShell>
                <thead>
                  <tr className="border-b border-border">
                    <th className={th}>#</th>
                    <th className={th}>Referrer</th>
                    <th className={th}>Referred</th>
                    <th className={th}>Converted</th>
                    <th className={th}>Volume</th>
                    <th className={th}>Bonus Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topReferrers.map((r, i) => (
                    <tr key={r.wallet}>
                      <td className={`${td} text-ink-faint`}>{i + 1}</td>
                      <td className={td}>
                        <Mono>{truncateWallet(r.wallet)}</Mono>
                      </td>
                      <td className={`${td} text-ink-dim`}>{r.referred}</td>
                      <td className={`${td} text-ink-dim`}>{r.converted}</td>
                      <td className={td}>
                        <Mono>{formatUsd(r.volume)}</Mono>
                      </td>
                      <td className={td}>
                        <Mono className="text-green">{formatUsd(r.bonus)}</Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">All Referral Records</h2>
            <div className="mb-3 max-w-sm">
              <div className="relative">
                <Input
                  placeholder="Search by wallet or referral code…"
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

            {tableLoading && !tableRows ? (
              <LoadingBlock />
            ) : tableError && !tableRows ? (
              <ErrorNote>{tableError}</ErrorNote>
            ) : !tableRows || tableRows.length === 0 ? (
              <EmptyState>No referral records match this search.</EmptyState>
            ) : (
              <>
                <TableShell>
                  <thead>
                    <tr className="border-b border-border">
                      <th className={th}>Referrer</th>
                      <th className={th}>Referred</th>
                      <th className={th}>Code Used</th>
                      <th className={th}>Volume</th>
                      <th className={th}>Bonus</th>
                      <th className={th}>Status</th>
                      <th className={th}>Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tableRows.map((r) => (
                      <tr key={r.id}>
                        <td className={td}>
                          <Mono>{truncateWallet(r.referrer_wallet)}</Mono>
                        </td>
                        <td className={td}>
                          <Mono>{truncateWallet(r.referred_wallet)}</Mono>
                        </td>
                        <td className={`${td} text-ink-dim`}>{r.referred_by_code}</td>
                        <td className={td}>
                          <Mono>{formatUsd(r.total_volume_usd)}</Mono>
                        </td>
                        <td className={td}>
                          <Mono className="text-green">{formatUsd(r.referrer_bonus_usd)}</Mono>
                        </td>
                        <td className={td}>
                          <Badge tone={r.has_purchased ? 'green' : 'neutral'}>{r.has_purchased ? 'Converted' : 'Pending'}</Badge>
                        </td>
                        <td className={`${td} text-ink-dim`}>{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
                {tableResult && (
                  <Pagination
                    page={tableResult.page}
                    pages={tableResult.pages}
                    total={tableResult.total}
                    limit={tableResult.limit}
                    onPageChange={setPage}
                    onLimitChange={setLimit}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
