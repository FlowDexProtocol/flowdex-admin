'use client';

import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getFinancialReport, getWithdrawals, postWithdrawal } from '@/lib/api';
import { formatDate, formatInt, formatTokens, formatUsd } from '@/lib/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Label,
  LoadingBlock,
  Mono,
  PageHeader,
  StatCard,
  SuccessNote,
  TableShell,
  td,
  th,
} from '@/components/ui';

const WITHDRAWAL_CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'solana', 'bitcoin', 'tron'];

export default function ReportsPage() {
  const { adminFetch } = useAdminAuth();

  const { data: report, loading, error } = useFetch(() => adminFetch((t) => getFinancialReport(t)), []);
  const { data: withdrawals, reload: reloadWithdrawals } = useFetch(() => adminFetch((t) => getWithdrawals(t)), []);

  const [chain, setChain] = useState(WITHDRAWAL_CHAINS[0]);
  const [cryptoCurrency, setCryptoCurrency] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [usdValue, setUsdValue] = useState('');
  const [recipient, setRecipient] = useState('');
  const [purpose, setPurpose] = useState('');
  const [txHash, setTxHash] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);
    try {
      const res = await adminFetch((t) =>
        postWithdrawal(t, {
          tx_hash: txHash || undefined,
          chain,
          crypto_currency: cryptoCurrency,
          crypto_amount: parseFloat(cryptoAmount),
          usd_value: parseFloat(usdValue),
          recipient,
          purpose,
          notes: notes || undefined,
        })
      );
      setSubmitSuccess(`Withdrawal #${res.withdrawal_id} recorded.`);
      setCryptoCurrency('');
      setCryptoAmount('');
      setUsdValue('');
      setRecipient('');
      setPurpose('');
      setTxHash('');
      setNotes('');
      reloadWithdrawals();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to record withdrawal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Financial Reports" description="Treasury summary, breakdowns, and withdrawal tracking." />

      {loading && !report ? (
        <LoadingBlock />
      ) : error && !report ? (
        <ErrorNote>{error}</ErrorNote>
      ) : report ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Raised" value={formatUsd(report.summary.total_raised_usd)} tone="primary" />
            <StatCard label="Total Withdrawn" value={formatUsd(report.summary.total_withdrawn)} tone="red" />
            <StatCard label="Net In Treasury" value={formatUsd(report.summary.net_in_treasury)} tone="green" />
            <StatCard label="OTC Allocated" value={formatUsd(report.summary.total_otc_allocated)} tone="purple" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-bold text-ink">By Currency</h2>
              {report.by_currency.length === 0 ? (
                <EmptyState>No confirmed purchases yet.</EmptyState>
              ) : (
                <TableShell>
                  <thead>
                    <tr className="border-b border-border">
                      <th className={th}>Currency</th>
                      <th className={th}>Volume</th>
                      <th className={th}>Txs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.by_currency.map((c) => (
                      <tr key={c.crypto_currency}>
                        <td className={`${td} text-ink-dim`}>{c.crypto_currency}</td>
                        <td className={td}>
                          <Mono>{formatUsd(c.vol)}</Mono>
                        </td>
                        <td className={td}>
                          <Mono>{formatInt(c.txs)}</Mono>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold text-ink">By Country</h2>
              {report.by_country.length === 0 ? (
                <EmptyState>No geo data yet.</EmptyState>
              ) : (
                <TableShell>
                  <thead>
                    <tr className="border-b border-border">
                      <th className={th}>Country</th>
                      <th className={th}>Buyers</th>
                      <th className={th}>Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.by_country.map((c) => (
                      <tr key={c.buyer_country}>
                        <td className={`${td} text-ink-dim`}>{c.buyer_country}</td>
                        <td className={td}>
                          <Mono>{formatInt(c.buyers)}</Mono>
                        </td>
                        <td className={td}>
                          <Mono>{formatUsd(c.vol)}</Mono>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-ink">Withdrawals by Purpose</h2>
            {report.withdrawals_by_purpose.length === 0 ? (
              <EmptyState>No withdrawals recorded yet.</EmptyState>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {report.withdrawals_by_purpose.map((w) => (
                  <Card key={w.purpose}>
                    <p className="text-xs uppercase tracking-widest text-ink-dim">{w.purpose}</p>
                    <Mono className="mt-1.5 block text-lg font-bold text-ink">{formatUsd(w.total)}</Mono>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <Card className="my-8">
        <p className="mb-4 text-sm font-bold text-ink">Record Withdrawal</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Chain</Label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2.5 text-sm text-ink outline-none focus:border-primary/60"
            >
              {WITHDRAWAL_CHAINS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={cryptoCurrency} onChange={(e) => setCryptoCurrency(e.target.value.toUpperCase())} required placeholder="ETH" />
          </div>
          <div>
            <Label>Crypto Amount</Label>
            <Input inputMode="decimal" value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value.replace(/[^0-9.]/g, ''))} required />
          </div>
          <div>
            <Label>USD Value</Label>
            <Input inputMode="decimal" value={usdValue} onChange={(e) => setUsdValue(e.target.value.replace(/[^0-9.]/g, ''))} required />
          </div>
          <div>
            <Label>Recipient</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
          </div>
          <div>
            <Label>Purpose</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required placeholder="marketing, dev, legal…" />
          </div>
          <div>
            <Label>Tx Hash (optional)</Label>
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Withdrawal'}
            </Button>
          </div>
        </form>
        {submitError && (
          <div className="mt-4">
            <ErrorNote>{submitError}</ErrorNote>
          </div>
        )}
        {submitSuccess && (
          <div className="mt-4">
            <SuccessNote>{submitSuccess}</SuccessNote>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">Withdrawal History</h2>
        {!withdrawals || withdrawals.length === 0 ? (
          <EmptyState>No withdrawals recorded yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Date</th>
                <th className={th}>Chain</th>
                <th className={th}>Amount</th>
                <th className={th}>USD Value</th>
                <th className={th}>Recipient</th>
                <th className={th}>Purpose</th>
                <th className={th}>Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className={`${td} text-ink-dim`}>{formatDate(w.created_at)}</td>
                  <td className={`${td} text-ink-dim`}>{w.chain}</td>
                  <td className={td}>
                    <Mono>
                      {formatTokens(w.crypto_amount, 6)} {w.crypto_currency}
                    </Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(w.usd_value)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono className="text-xs">{w.recipient}</Mono>
                  </td>
                  <td className={`${td} text-ink-dim`}>{w.purpose}</td>
                  <td className={`${td} text-ink-dim`}>{w.created_by}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
