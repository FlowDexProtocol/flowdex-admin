'use client';

// ══════════════════════════════════════════════════
// OTC bulk import
//
// Two deliberate steps. Preview validates the file and writes nothing;
// commit writes. The admin sees exactly what will happen, row by row,
// before any money is credited or any message is posted — which at 500
// rows is the difference between a correction and an incident.
// ══════════════════════════════════════════════════

import { useState, type ChangeEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import {
  postOtcImportPreview,
  postOtcImportCommit,
  getOtcImportBatches,
  postOtcImportRevert,
  downloadOtcImportTemplate,
} from '@/lib/api';
import { formatDate, formatTokens, formatUsd } from '@/lib/format';
import type { OtcImportPreviewResponse, OtcImportCommitResponse } from '@/lib/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  LoadingBlock,
  Mono,
  PageHeader,
  SuccessNote,
  TableShell,
} from '@/components/ui';

const th = 'px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-ink-dim';
const td = 'px-4 py-2.5 text-sm';

export default function OtcImportPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OtcImportPreviewResponse | null>(null);
  const [result, setResult] = useState<OtcImportCommitResponse | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  const {
    data: batches,
    loading: batchesLoading,
    reload: reloadBatches,
  } = useFetch(() => adminFetch((t) => getOtcImportBatches(t)), []);

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    // A new file invalidates whatever was on screen; leaving a stale preview
    // next to a different filename is how the wrong batch gets committed.
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function runPreview() {
    if (!file) return;
    setBusy('preview');
    setError(null);
    setResult(null);
    try {
      const res = await adminFetch((t) => postOtcImportPreview(t, file));
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreview(null);
    } finally {
      setBusy(null);
    }
  }

  async function runCommit() {
    if (!file || !preview) return;
    const n = preview.summary.valid_rows;
    const usd = formatUsd(preview.summary.total_usd);
    if (!window.confirm(
      `Schedule ${n} allocation${n === 1 ? '' : 's'} totalling ${usd}?\n\n` +
      'Nothing is credited or announced now. Each one releases at its own ' +
      'release_at time, priced at the tier live at that moment, and is ' +
      'announced to the public channel then.'
    )) return;

    setBusy('commit');
    setError(null);
    try {
      const res = await adminFetch((t) => postOtcImportCommit(t, file));
      setResult(res);
      setPreview(null);
      setFile(null);
      showToast('success', `Imported ${res.imported} payment${res.imported === 1 ? '' : 's'}`);
      reloadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  }

  async function revert(id: number) {
    if (!window.confirm(
      `Revert batch #${id}?\n\n` +
      'Allocations are deleted and the tier totals are reduced by what this batch added. ' +
      'Messages already posted to the channel are not removed.'
    )) return;
    try {
      const res = await adminFetch((t) => postOtcImportRevert(t, id));
      showToast('success', `Reverted ${res.reverted} allocation${res.reverted === 1 ? '' : 's'}`);
      reloadBatches();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Revert failed');
    }
  }

  async function template() {
    try {
      await adminFetch((t) => downloadOtcImportTemplate(t));
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Download failed');
    }
  }

  const rows = preview?.rows ?? [];
  const shown = showOnlyProblems
    ? rows.filter((r) => r.errors.length || r.warnings.length)
    : rows;

  return (
    <div>
      <PageHeader
        title="OTC Bulk Import"
        description="Upload a CSV of received payments. Every row is validated before anything is written."
        action={<Button variant="secondary" onClick={template}>Download template</Button>}
      />

      <Card className="mb-6">
        <p className="mb-3 text-sm font-bold text-ink">1. Choose a file</p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={pickFile}
          className="block w-full text-sm text-ink-dim file:mr-4 file:rounded-lg file:border-0 file:bg-primary-dim file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary-dim/70"
        />
        <p className="mt-2 text-xs text-ink-faint">
          Columns: investor_name, investor_wallet, usd_amount, payment_currency, release_at,
          and optionally crypto_amount, received_at and notes. Up to 500 rows.
          <br />
          release_at is when the allocation happens and the channel is told. It must be
          in the future, at most 90 days ahead. Write it with your offset, for example
          2026-10-20T19:15:00+04:00, so the time means what you intend.
          <br />
          received_at is optional, private, and never announced.
        </p>

        {file && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Mono className="text-sm text-ink">{file.name}</Mono>
            <Button onClick={runPreview} disabled={busy !== null}>
              {busy === 'preview' ? 'Checking…' : 'Preview'}
            </Button>
          </div>
        )}
      </Card>

      {error && <div className="mb-6"><ErrorNote>{error}</ErrorNote></div>}

      {result && (
        <Card className="mb-6">
          <SuccessNote>
            Batch #{result.batch_id}: scheduled {result.imported} allocation
            {result.imported === 1 ? '' : 's'} totalling {formatUsd(result.total_usd)}.
            Each releases at its own time and is announced then.
            {result.failed > 0 && ` ${result.failed} row(s) failed.`}
          </SuccessNote>
          {result.failures?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red">
              {result.failures.map((f) => (
                <li key={f.line}>Line {f.line}: {f.error}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-faint">
            Announcements are queued and post roughly every 3.5 seconds, so a large batch
            takes a while to appear in the channel.
          </p>
        </Card>
      )}

      {preview && (
        <Card className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">2. Review</p>
            <label className="flex items-center gap-2 text-xs text-ink-dim">
              <input
                type="checkbox"
                checked={showOnlyProblems}
                onChange={(e) => setShowOnlyProblems(e.target.checked)}
              />
              Show only rows with problems
            </label>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Valid" value={String(preview.summary.valid_rows)} tone="green" />
            <Summary label="Errors" value={String(preview.summary.error_rows)} tone={preview.summary.error_rows ? 'red' : 'neutral'} />
            <Summary label="Warnings" value={String(preview.summary.warning_rows)} tone={preview.summary.warning_rows ? 'amber' : 'neutral'} />
            <Summary label="Total" value={formatUsd(preview.summary.total_usd)} tone="primary" />
          </div>

          {preview.summary.first_release && (
            <p className="mb-4 text-xs text-ink-faint">
              {preview.summary.first_release === preview.summary.last_release
                ? `All ${preview.summary.valid_rows} release together at ${formatDate(preview.summary.first_release)}. They are announced one at a time, a few seconds apart, so the channel takes a few minutes to work through them.`
                : `Releases run from ${formatDate(preview.summary.first_release)} to ${formatDate(preview.summary.last_release!)}.`}
            </p>
          )}

          {preview.summary.active_tier && (
            <p className="mb-4 text-xs text-ink-faint">
              Active tier {preview.summary.active_tier.name} at ${preview.summary.active_tier.price}.
              Roughly {formatTokens(preview.summary.estimated_tokens ?? 0)} FDP at today&apos;s price —
              indicative only, since each row is priced at whichever tier is live when it
              releases, not at import.
            </p>
          )}

          <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Line</th>
                  <th className={th}>Investor</th>
                  <th className={th}>Amount</th>
                  <th className={th}>Paid in</th>
                  <th className={th}>Releases</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => (
                  <tr key={r.line} className={r.errors.length ? 'bg-red-dim/20' : undefined}>
                    <td className={`${td} text-ink-faint`}>{r.line}</td>
                    <td className={td}>
                      <p className="text-ink">{r.row.investor_name || '—'}</p>
                      <Mono className="text-xs text-ink-faint">
                        {r.row.investor_wallet
                          ? `${r.row.investor_wallet.slice(0, 10)}…${r.row.investor_wallet.slice(-4)}`
                          : '—'}
                      </Mono>
                    </td>
                    <td className={td}>
                      <Mono>{Number.isFinite(r.row.usd_amount) ? formatUsd(r.row.usd_amount) : '—'}</Mono>
                    </td>
                    <td className={td}>
                      <Mono className="text-ink-dim">
                        {r.row.crypto_amount ? `${r.row.crypto_amount} ` : ''}{r.row.payment_currency || '—'}
                      </Mono>
                    </td>
                    <td className={`${td} text-ink-dim`}>
                      {r.row.release_at ? formatDate(r.row.release_at) : '—'}
                    </td>
                    <td className={td}>
                      {r.errors.length ? (
                        <div className="space-y-1">
                          {r.errors.map((e, i) => <Badge key={i} tone="red">{e}</Badge>)}
                        </div>
                      ) : r.warnings.length ? (
                        <div className="space-y-1">
                          {r.warnings.map((w, i) => <Badge key={i} tone="amber">{w}</Badge>)}
                        </div>
                      ) : (
                        <Badge tone="green">ok</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
          </TableShell>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={runCommit} disabled={busy !== null || preview.summary.valid_rows === 0}>
              {busy === 'commit'
                ? 'Importing…'
                : `Import ${preview.summary.valid_rows} payment${preview.summary.valid_rows === 1 ? '' : 's'}`}
            </Button>
            {preview.summary.error_rows > 0 && (
              <span className="text-xs text-ink-faint">
                {preview.summary.error_rows} row(s) with errors will be skipped.
              </span>
            )}
          </div>
        </Card>
      )}

      <Card>
        <p className="mb-4 text-sm font-bold text-ink">Import history</p>
        {batchesLoading && !batches ? (
          <LoadingBlock />
        ) : !batches || batches.length === 0 ? (
          <EmptyState>No imports yet.</EmptyState>
        ) : (
          <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Batch</th>
                  <th className={th}>File</th>
                  <th className={th}>By</th>
                  <th className={th}>Rows</th>
                  <th className={th}>Total</th>
                  <th className={th}>Status</th>
                  <th className={th}>When</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className={`${td} text-ink-faint`}>#{b.id}</td>
                    <td className={`${td} text-ink`}>{b.filename || '—'}</td>
                    <td className={`${td} text-ink-dim`}>{b.uploaded_by}</td>
                    <td className={td}><Mono>{b.row_count}</Mono></td>
                    <td className={td}><Mono>{formatUsd(b.total_usd)}</Mono></td>
                    <td className={td}>
                      <Badge tone={b.status === 'reverted' ? 'neutral' : 'green'}>
                        {b.status === 'reverted' ? 'Reverted' : 'Committed'}
                      </Badge>
                    </td>
                    <td className={`${td} text-ink-dim`}>{formatDate(b.created_at)}</td>
                    <td className={td}>
                      {b.status !== 'reverted' && b.live_allocations > 0 && (
                        <Button
                          variant="danger"
                          className="!px-3 !py-1.5 text-xs"
                          onClick={() => revert(b.id)}
                        >
                          Revert
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'amber' | 'primary' | 'neutral' }) {
  const colour = {
    green: 'text-green',
    red: 'text-red',
    amber: 'text-amber',
    primary: 'text-primary',
    neutral: 'text-ink-dim',
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-bg-soft px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-ink-dim">{label}</p>
      <p className={`mt-1 text-lg font-bold ${colour}`}>{value}</p>
    </div>
  );
}
