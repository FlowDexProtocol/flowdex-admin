'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getOverrides, getOverridesHistory, postOverrideClear, postOverrideSet } from '@/lib/api';
import { OVERRIDE_KEYS } from '@/lib/types';
import { formatDate, formatPct, formatUsd, toNum } from '@/lib/format';
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
  Select,
  SuccessNote,
  TableShell,
  Textarea,
  td,
  th,
} from '@/components/ui';

export default function OverridesPage() {
  const { adminFetch } = useAdminAuth();

  const [key, setKey] = useState<string>(OVERRIDE_KEYS[0].key);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [clearTarget, setClearTarget] = useState<string | null>(null);
  const [clearReason, setClearReason] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const { data: overridesRes, loading, error, reload: reloadOverrides } = useFetch(() => adminFetch((t) => getOverrides(t)), []);
  const { data: history, reload: reloadHistory } = useFetch(() => adminFetch((t) => getOverridesHistory(t)), []);

  const activeMap = useMemo(() => {
    const map = new Map<string, string>();
    overridesRes?.overrides.forEach((o) => map.set(o.key, o.value));
    return map;
  }, [overridesRes]);

  const real = overridesRes?.real_data;
  const realProgressPct = real ? (toNum(real.total_raised_usd) / Math.max(toNum(real.hard_cap_usd), 1)) * 100 : null;

  const comparisonRows: { key: string; label: string; real: string }[] = real
    ? [
        { key: 'raised_override', label: 'Raised Amount', real: formatUsd(real.total_raised_usd) },
        { key: 'progress_bar_override', label: 'Progress %', real: formatPct(realProgressPct ?? 0, 2) },
        { key: 'tier_override', label: 'Tier ID', real: String(real.id) + ' — ' + real.name },
        { key: 'price_override', label: 'Price', real: `$${toNum(real.price).toFixed(4)}` },
        { key: 'bonus_override', label: 'Bonus Text', real: '— (no real equivalent)' },
        { key: 'status_override', label: 'Status Text', real: '— (no real equivalent)' },
        { key: 'countdown_override', label: 'Countdown Text', real: '— (no real equivalent)' },
      ]
    : [];

  async function handleSet(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    if (!reason.trim()) {
      setSubmitError('Reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminFetch((t) => postOverrideSet(t, { key, value, reason }));
      setSubmitSuccess(`Override "${key}" set to "${value}".`);
      setValue('');
      setReason('');
      reloadOverrides();
      reloadHistory();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to set override');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear(e: FormEvent) {
    e.preventDefault();
    if (!clearTarget) return;
    setClearError(null);
    if (!clearReason.trim()) {
      setClearError('Reason is required.');
      return;
    }
    setClearing(true);
    try {
      await adminFetch((t) => postOverrideClear(t, clearTarget, clearReason));
      setClearTarget(null);
      setClearReason('');
      reloadOverrides();
      reloadHistory();
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Failed to clear override');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      <PageHeader title="Display Overrides" description="Override values shown to buyers without touching real presale data." />

      <Card className="mb-6">
        <p className="mb-4 text-sm font-bold text-ink">Set Override</p>
        <form onSubmit={handleSet} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Key</Label>
            <Select value={key} onChange={(e) => setKey(e.target.value)}>
              {OVERRIDE_KEYS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <div className="sm:col-span-1">
            <Label>Reason (required)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Set Override'}
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

      {loading && !overridesRes ? (
        <LoadingBlock />
      ) : error && !overridesRes ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-ink">Real vs. Display</h2>
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Field</th>
                <th className={th}>Real Value</th>
                <th className={th}>Display Value</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparisonRows.map((row) => {
                const activeValue = activeMap.get(row.key);
                return (
                  <tr key={row.key}>
                    <td className={`${td} text-ink-dim`}>{row.label}</td>
                    <td className={td}>
                      <Mono className="text-ink">{row.real}</Mono>
                    </td>
                    <td className={td}>
                      {activeValue !== undefined ? (
                        <Mono className="text-primary">{activeValue}</Mono>
                      ) : (
                        <span className="text-xs text-ink-faint">Using real value</span>
                      )}
                    </td>
                    <td className={td}>
                      {activeValue !== undefined && (
                        <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => setClearTarget(row.key)}>
                          Clear
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">Override History</h2>
        {!history || history.length === 0 ? (
          <EmptyState>No override history yet.</EmptyState>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Key</th>
                <th className={th}>Value</th>
                <th className={th}>Action</th>
                <th className={th}>Reason</th>
                <th className={th}>By</th>
                <th className={th}>When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className={`${td} text-ink-dim`}>{h.key}</td>
                  <td className={td}>
                    <Mono>{h.value ?? '—'}</Mono>
                  </td>
                  <td className={td}>
                    <Badge tone={h.action === 'set' ? 'primary' : 'neutral'}>{h.action}</Badge>
                  </td>
                  <td className={`${td} text-ink-dim`}>{h.reason}</td>
                  <td className={`${td} text-ink-dim`}>{h.performed_by}</td>
                  <td className={`${td} text-ink-dim`}>{formatDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>

      <Modal open={!!clearTarget} onClose={() => setClearTarget(null)} title={`Clear "${clearTarget}"`}>
        <form onSubmit={handleClear} className="space-y-4">
          <div>
            <Label>Reason (required)</Label>
            <Textarea rows={3} value={clearReason} onChange={(e) => setClearReason(e.target.value)} required />
          </div>
          {clearError && <ErrorNote>{clearError}</ErrorNote>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setClearTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={clearing}>
              {clearing ? 'Clearing…' : 'Clear Override'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
