'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import {
  getOtcHistory,
  getOtcToday,
  postOtcAllocate,
  postOtcCancel,
  postOtcPartialCancel,
  postOtcPause,
  postOtcRecordPayment,
  postOtcResume,
} from '@/lib/api';
import { formatDate, formatTokens, formatUsd } from '@/lib/format';
import type { OtcAllocation, OtcStatus } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Label,
  LoadingBlock,
  Modal,
  Mono,
  PageHeader,
  ProgressBar,
  Select,
  StatCard,
  SuccessNote,
  TableShell,
  Textarea,
  td,
  th,
} from '@/components/ui';

const CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'solana', 'bitcoin', 'tron'];

const STATUS_TONE: Record<OtcStatus, 'amber' | 'primary' | 'green' | 'red'> = {
  allocated: 'amber',
  partial: 'primary',
  completed: 'green',
  cancelled: 'red',
};
const STATUS_LABEL: Record<OtcStatus, string> = {
  allocated: 'Allocated',
  partial: 'Partial',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

// ── Record Payment modal ──

function RecordPaymentModal({
  allocation,
  onClose,
  onSuccess,
}: {
  allocation: OtcAllocation;
  onClose: () => void;
  onSuccess: (updated: OtcAllocation) => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [usdAmount, setUsdAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [chain, setChain] = useState(CHAINS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unpaidUsd = num(allocation.total_allocated_usd) - num(allocation.paid_amount);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(usdAmount);
    if (!amount || amount <= 0) {
      setError('Enter a USD amount greater than 0.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminFetch((t) =>
        postOtcRecordPayment(t, allocation.id, { usd_amount: amount, tx_hash: txHash || undefined, chain })
      );
      showToast('success', `Payment of ${formatUsd(amount)} recorded — allocation is now ${res.allocation.status}.`);
      onSuccess(res.allocation);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record payment';
      setError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-ink-faint">
          {formatUsd(allocation.paid_amount)} paid of {formatUsd(allocation.total_allocated_usd)} —{' '}
          {formatUsd(Math.max(unpaidUsd, 0))} outstanding.
        </p>
        <div>
          <Label required>USD Amount</Label>
          <Input
            inputMode="decimal"
            value={usdAmount}
            onChange={(e) => setUsdAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="10000"
            autoFocus
            required
          />
        </div>
        <div>
          <Label>Transaction Hash</Label>
          <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} className="font-mono text-xs" placeholder="0x…" />
        </div>
        <div>
          <Label>Chain</Label>
          <Select value={chain} onChange={(e) => setChain(e.target.value)}>
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Recording…' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Cancel / Partial-cancel modal ──

function CancelModal({
  allocation,
  onClose,
  onSuccess,
}: {
  allocation: OtcAllocation;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [tokensToCancel, setTokensToCancel] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unpaidTokens = Math.max(num(allocation.total_tokens_allocated) - num(allocation.paid_tokens), 0);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res =
        mode === 'full'
          ? await adminFetch((t) => postOtcCancel(t, allocation.id, reason || undefined))
          : await adminFetch((t) => postOtcPartialCancel(t, allocation.id, parseFloat(tokensToCancel), reason || undefined));

      if (!res.success) throw new Error(res.error || 'Cancellation failed');

      showToast('success', `Allocation cancelled. ${formatTokens(res.tokens_returned)} tokens returned to ${res.returned_to_tier || 'the active tier'}.`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancellation failed';
      setError(message);
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  const partialAmount = parseFloat(tokensToCancel);
  const partialInvalid = mode === 'partial' && (!partialAmount || partialAmount <= 0 || partialAmount > unpaidTokens);

  return (
    <Modal open onClose={onClose} title="Cancel OTC Allocation">
      <div className="space-y-4">
        <p className="text-sm text-ink">Cancel this OTC allocation?</p>
        <p className="text-xs text-ink-faint">
          Up to <span className="font-mono text-ink">{formatTokens(unpaidTokens)}</span> $FDP (the unpaid portion) will be
          returned to the active presale tier.
        </p>

        <div className="flex gap-1 rounded-lg border border-border bg-bg-soft p-1">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`min-h-9 flex-1 rounded-md text-sm font-semibold transition-colors ${mode === 'full' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'}`}
          >
            Cancel Full Allocation
          </button>
          <button
            type="button"
            onClick={() => setMode('partial')}
            className={`min-h-9 flex-1 rounded-md text-sm font-semibold transition-colors ${mode === 'partial' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'}`}
          >
            Cancel Partial Amount
          </button>
        </div>

        {mode === 'partial' && (
          <div>
            <Label required>Tokens to Cancel</Label>
            <Input
              inputMode="decimal"
              value={tokensToCancel}
              onChange={(e) => setTokensToCancel(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder={`Up to ${formatTokens(unpaidTokens)}`}
              autoFocus
            />
            {partialAmount > unpaidTokens && (
              <p className="mt-1 text-xs text-red">Cannot exceed the unpaid amount ({formatTokens(unpaidTokens)}).</p>
            )}
          </div>
        )}

        <div>
          <Label>Reason (optional)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Investor did not complete payment…" />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button type="button" variant="danger" disabled={submitting || partialInvalid} onClick={handleConfirm}>
            {submitting ? 'Cancelling…' : mode === 'full' ? 'Cancel Full Allocation' : 'Cancel Partial Amount'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── View Details modal ──

function DetailsModal({
  allocation,
  onClose,
  onChanged,
}: {
  allocation: OtcAllocation;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handlePause() {
    setBusy(true);
    try {
      await adminFetch((t) => postOtcPause(t, allocation.id));
      showToast('success', 'Drip paused');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to pause drip');
    } finally {
      setBusy(false);
    }
  }

  async function handleResume() {
    setBusy(true);
    try {
      await adminFetch((t) => postOtcResume(t, allocation.id));
      showToast('success', 'Drip resumed');
      onChanged();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to resume drip');
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, React.ReactNode][] = [
    ['Investor', allocation.investor_name],
    ['Wallet', <Mono key="w">{allocation.investor_wallet}</Mono>],
    ['Tier at Allocation', `#${allocation.tier_at_allocation}`],
    ['Tier Price', formatUsd(allocation.tier_price, { minimumFractionDigits: 4, maximumFractionDigits: 8 })],
    ['Total Allocated', `${formatTokens(allocation.total_tokens_allocated)} $FDP (${formatUsd(allocation.total_allocated_usd)})`],
    ['Paid', `${formatTokens(allocation.paid_tokens)} $FDP (${formatUsd(allocation.paid_amount)})`],
    ['Drip Released', formatUsd(allocation.drip_released_usd)],
    ['Drip Status', allocation.drip_status],
    ['Payment Status', STATUS_LABEL[allocation.status]],
    ['Payment Method', allocation.payment_method || '—'],
    ['Payment Reference', allocation.payment_reference || '—'],
    ['Notes', allocation.notes || '—'],
    ['Created', formatDate(allocation.created_at)],
  ];

  if (num(allocation.tokens_returned) > 0) {
    rows.push(['Total Returned (cancellations)', `${formatTokens(allocation.tokens_returned)} $FDP`]);
  }
  if (allocation.status === 'cancelled') {
    rows.push(['Cancelled At', formatDate(allocation.cancelled_at)]);
    rows.push(['Cancel Reason', allocation.cancel_reason || '—']);
  }

  return (
    <Modal open onClose={onClose} title={`Allocation #${allocation.id}`} size="lg">
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-b-0">
            <span className="shrink-0 text-ink-faint">{label}</span>
            <span className="text-right text-ink">{value}</span>
          </div>
        ))}
      </div>

      {['allocated', 'partial'].includes(allocation.status) && (
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          {allocation.drip_status === 'active' && (
            <Button variant="secondary" disabled={busy} onClick={handlePause}>
              Pause Drip
            </Button>
          )}
          {allocation.drip_status === 'paused' && (
            <Button variant="secondary" disabled={busy} onClick={handleResume}>
              Resume Drip
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main page ──

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

  const [statusFilter, setStatusFilter] = useState<OtcStatus | 'all'>('all');
  const [paymentModalTarget, setPaymentModalTarget] = useState<OtcAllocation | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<OtcAllocation | null>(null);
  const [detailsModalTarget, setDetailsModalTarget] = useState<OtcAllocation | null>(null);

  const { data: today, loading: todayLoading, error: todayError, reload: reloadToday } = useFetch(
    () => adminFetch((t) => getOtcToday(t)),
    []
  );
  const { data: history, loading: historyLoading, error: historyError, reload: reloadHistory } = useFetch(
    () => adminFetch((t) => getOtcHistory(t)),
    []
  );

  function reloadAll() {
    reloadToday();
    reloadHistory();
  }

  const summary = useMemo(() => {
    const rows = history ?? [];
    const allocated = rows.reduce((sum, r) => sum + num(r.total_tokens_allocated), 0);
    const paidUsd = rows.reduce((sum, r) => sum + num(r.paid_amount), 0);
    const pendingUsd = rows
      .filter((r) => r.status === 'allocated' || r.status === 'partial')
      .reduce((sum, r) => sum + Math.max(num(r.total_allocated_usd) - num(r.paid_amount), 0), 0);
    const returned = rows.reduce((sum, r) => sum + num(r.tokens_returned), 0);
    return { allocated, paidUsd, pendingUsd, returned };
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!history) return history;
    if (statusFilter === 'all') return history;
    return history.filter((r) => r.status === statusFilter);
  }, [history, statusFilter]);

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
      reloadAll();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Allocation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="OTC Management" description="Manual OTC investor allocations with daily drip release." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total OTC Allocated" value={formatTokens(summary.allocated)} sub="$FDP" />
        <StatCard label="Total OTC Paid" value={formatUsd(summary.paidUsd)} tone="green" />
        <StatCard label="Total OTC Pending" value={formatUsd(summary.pendingUsd)} sub="unpaid, active allocations" tone="primary" />
        <StatCard label="Total OTC Cancelled" value={formatTokens(summary.returned)} sub="$FDP returned" tone="red" />
      </div>

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
                <div>
                  <p className="text-sm font-semibold text-ink">{a.investor_name}</p>
                  <Mono className="text-xs text-ink-faint">{a.investor_wallet}</Mono>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">History</h2>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OtcStatus | 'all')} className="w-40">
            <option value="all">All statuses</option>
            <option value="allocated">Allocated</option>
            <option value="partial">Partial</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        {historyLoading && !history ? (
          <LoadingBlock />
        ) : historyError && !history ? (
          <ErrorNote>{historyError}</ErrorNote>
        ) : !filteredHistory || filteredHistory.length === 0 ? (
          <EmptyState>No OTC allocations{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>ID</th>
                <th className={th}>Investor</th>
                <th className={th}>Token Amount</th>
                <th className={th}>OTC Price</th>
                <th className={th}>USD Value</th>
                <th className={th}>Paid Amount</th>
                <th className={th}>Paid Tokens</th>
                <th className={th}>Status</th>
                <th className={th}>Created</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHistory.map((a) => (
                <tr key={a.id}>
                  <td className={`${td} text-ink-faint`}>#{a.id}</td>
                  <td className={td}>
                    <p className="text-ink">{a.investor_name}</p>
                    <Mono className="text-xs text-ink-faint">{a.investor_wallet.slice(0, 10)}…</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatTokens(a.total_tokens_allocated)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(a.tier_price, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(a.total_allocated_usd)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatUsd(a.paid_amount)}</Mono>
                  </td>
                  <td className={td}>
                    <Mono>{formatTokens(a.paid_tokens)}</Mono>
                  </td>
                  <td className={td}>
                    <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </td>
                  <td className={`${td} text-ink-dim`}>{formatDate(a.created_at)}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1.5">
                      {(a.status === 'allocated' || a.status === 'partial') && (
                        <>
                          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setPaymentModalTarget(a)}>
                            Record Payment
                          </Button>
                          <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => setCancelModalTarget(a)}>
                            Cancel
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => setDetailsModalTarget(a)}>
                        View Details
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      {paymentModalTarget && (
        <RecordPaymentModal allocation={paymentModalTarget} onClose={() => setPaymentModalTarget(null)} onSuccess={reloadAll} />
      )}
      {cancelModalTarget && (
        <CancelModal allocation={cancelModalTarget} onClose={() => setCancelModalTarget(null)} onSuccess={reloadAll} />
      )}
      {detailsModalTarget && (
        <DetailsModal
          allocation={detailsModalTarget}
          onClose={() => setDetailsModalTarget(null)}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}
