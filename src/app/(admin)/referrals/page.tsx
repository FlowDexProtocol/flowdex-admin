'use client';

import { useMemo } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getAdminReferrals, getBurns, getTerminalCredits } from '@/lib/api';
import { formatTokens, formatUsd, toNum, truncateWallet } from '@/lib/format';
import { EmptyState, ErrorNote, LoadingBlock, Mono, PageHeader, StatCard, TableShell, td, th } from '@/components/ui';

export default function ReferralsPage() {
  const { adminFetch } = useAdminAuth();

  const { data: referrals, loading, error } = useFetch(() => adminFetch((t) => getAdminReferrals(t)), []);
  const { data: credits } = useFetch(() => adminFetch((t) => getTerminalCredits(t)), []);
  const { data: burns } = useFetch(() => adminFetch((t) => getBurns(t)), []);

  const summary = useMemo(() => {
    if (!referrals) return { total: 0, conversions: 0, volume: 0 };
    return {
      total: referrals.length,
      conversions: referrals.filter((r) => r.has_purchased).length,
      volume: referrals.reduce((sum, r) => sum + toNum(r.total_volume_usd), 0),
    };
  }, [referrals]);

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

  return (
    <div>
      <PageHeader title="Referral Dashboard" description="Referral performance across the presale." />

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
        </div>
      )}
    </div>
  );
}
