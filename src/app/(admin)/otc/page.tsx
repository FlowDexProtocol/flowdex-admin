'use client';

import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getOtcHistory, getOtcToday, postOtcAllocate, postOtcPause, postOtcResume } from '@/lib/api';
import { formatDate, formatTokens, formatUsd } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Label,
  LoadingBlock,
  Mono,
  PageHeader,
  ProgressBar,
  SuccessNote,
  TableShell,
  Textarea,
  td,
  th,
} from '@/components/ui';

export default function OtcPage() {
  const { adminFetch } = useAdminAuth();

  const [investorName, setInvestorName] = useState('');
  const [investorWallet, setInvestorWallet] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const { data: today, loading: todayLoading, error: todayError, reload: reloadToday } = useFetch(
    () => adminFetch((t) => getOtcToday(t)),
    []
  );
  const { data: history, loading: historyLoading, error: historyError, reload: reloadHistory } = useFetch(
    () => adminFetch((t) => getOtcHistory(t)),
    []
  );

  async function handleAllocate(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);
    try {
      const res = await adminFetch((t) =>
        postOtcAllocate(t, {
          investor_name: investorName,
          investor_wallet: investorWallet,
          amount_usd: parseFloat(amountUsd),
          payment_reference: paymentReference || undefined,
          notes: notes || undefined,
        })
      );
      setSubmitSuccess(`Allocated ${formatTokens(res.tokens)} $FDP — drip ends ${formatDate(res.drip_ends_at)}.`);
      setInvestorName('');
      setInvestorWallet('');
      setAmountUsd('');
      setPaymentReference('');
      setNotes('');
      reloadToday();
      reloadHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Allocation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePause(id: number) {
    setActionError(null);
    setActionId(id);
    try {
      await adminFetch((t) => postOtcPause(t, id));
      reloadToday();
      reloadHistory();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Pause failed');
    } finally {
      setActionId(null);
    }
  }

  async function handleResume(id: number) {
    setActionError(null);
    setActionId(id);
    try {
      await adminFetch((t) => postOtcResume(t, id));
      reloadToday();
      reloadHistory();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Resume failed');
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <PageHeader title="OTC Management" description="Manual OTC investor allocations with daily drip release." />

      <Card className="mb-6">
        <p className="mb-4 text-sm font-bold text-ink">Create Daily Allocation</p>
        <form onSubmit={handleAllocate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Investor Name</Label>
            <Input value={investorName} onChange={(e) => setInvestorName(e.target.value)} required />
          </div>
          <div>
            <Label>Investor Wallet</Label>
            <Input value={investorWallet} onChange={(e) => setInvestorWallet(e.target.value)} required />
          </div>
          <div>
            <Label>Amount (USD)</Label>
            <Input
              inputMode="decimal"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value.replace(/[^0-9.]/g, ''))}
              required
            />
          </div>
          <div>
            <Label>Payment Reference</Label>
            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Allocating…' : 'Create Allocation'}
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

      {actionError && (
        <div className="mb-4">
          <ErrorNote>{actionError}</ErrorNote>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-ink">Today&rsquo;s Active Drips</h2>
        {todayLoading && !today ? (
          <LoadingBlock />
        ) : todayError && !today ? (
          <ErrorNote>{todayError}</ErrorNote>
        ) : !today || today.length === 0 ? (
          <EmptyState>No active drips right now.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {today.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{a.investor_name}</p>
                    <Mono className="text-xs text-ink-faint">{a.investor_wallet}</Mono>
                  </div>
                  <Button variant="danger" onClick={() => handlePause(a.id)} disabled={actionId === a.id} className="!px-3 !py-1.5 text-xs">
                    Pause
                  </Button>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-ink-dim">
                    <Mono>{formatUsd(a.released)}</Mono>
                    <Mono>{formatUsd(a.allocation)}</Mono>
                  </div>
                  <ProgressBar pct={parseFloat(a.progress)} />
                  <p className="mt-1 text-xs text-ink-faint">{a.progress} released · ends {formatDate(a.estimated_completion)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">History</h2>
        {historyLoading && !history ? (
          <LoadingBlock />
        ) : historyError && !history ? (
          <ErrorNote>{historyError}</ErrorNote>
        ) : !history || history.length === 0 ? (
          <EmptyState>No OTC allocations yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Investor</th>
                <th className={th}>Wallet</th>
                <th className={th}>Total Allocated</th>
                <th className={th}>Tokens</th>
                <th className={th}>Status</th>
                <th className={th}>Created</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{a.investor_name}</td>
                  <td className={td}>
                    <Mono>{a.investor_wallet.slice(0, 10)}…</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(a.total_allocated_usd)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatTokens(a.total_tokens_allocated)}</Mono>
                  </td>
                  <td className={td}>
                    <Badge tone={a.drip_status === 'active' ? 'green' : a.drip_status === 'paused' ? 'yellow' : 'neutral'}>
                      {a.drip_status}
                    </Badge>
                  </td>
                  <td className={`${td} text-ink-dim`}>{formatDate(a.created_at)}</td>
                  <td className={td}>
                    {a.drip_status === 'paused' && (
                      <Button variant="secondary" onClick={() => handleResume(a.id)} disabled={actionId === a.id} className="!px-3 !py-1.5 text-xs">
                        Resume
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
