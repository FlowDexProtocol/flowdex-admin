'use client';

import { useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useFetch } from '@/lib/hooks';
import { getReconciliation, postReconciliationRun } from '@/lib/api';
import type { ReconciliationRunResult } from '@/lib/types';
import { formatDateGmt4 } from '@/lib/format';
import { Badge, Button, Card, EmptyState, ErrorNote, LoadingBlock, Mono, PageHeader, TableShell, td, th } from '@/components/ui';

export default function ReconciliationPage() {
  const { adminFetch } = useAdminAuth();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<ReconciliationRunResult[] | null>(null);

  const { data: results, loading, error, reload } = useFetch(() => adminFetch((t) => getReconciliation(t)), []);

  const latestByChain = useMemo(() => {
    if (!results) return [];
    const map = new Map<string, (typeof results)[number]>();
    for (const r of results) {
      if (!map.has(r.chain)) map.set(r.chain, r);
    }
    return Array.from(map.values());
  }, [results]);

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    setRunResults(null);
    try {
      const res = await adminFetch((t) => postReconciliationRun(t));
      setRunResults(res.results);
      reload();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Reconciliation run failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        description="On-chain vs. database comparison per chain (24h look-back window)."
        action={
          <Button onClick={handleRun} disabled={running}>
            {running ? 'Running…' : 'Run Reconciliation Now'}
          </Button>
        }
      />

      {runError && (
        <div className="mb-4">
          <ErrorNote>{runError}</ErrorNote>
        </div>
      )}
      {runResults && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {runResults.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-dim">Run completed — no chains were configured to reconcile.</p>
            </Card>
          ) : (
            runResults.map((r) => (
              <Card key={r.chain}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{r.chain}</span>
                  <Badge tone={r.status === 'clean' ? 'green' : 'red'}>{r.status.replace('_', ' ')}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-dim">
                  {r.unmatched_incoming} unmatched incoming · {r.unmatched_records} unmatched records
                </p>
              </Card>
            ))
          )}
        </div>
      )}

      {loading && !results ? (
        <LoadingBlock />
      ) : error && !results ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {latestByChain.length === 0 ? (
              <EmptyState>No reconciliation runs recorded yet.</EmptyState>
            ) : (
              latestByChain.map((r) => (
                <Card key={r.chain}>
                  <p className="text-xs uppercase tracking-widest text-ink-dim">Last Run — {r.chain}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={r.status === 'clean' ? 'green' : 'red'}>{r.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-ink-faint">{formatDateGmt4(r.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs text-ink-dim">
                    {r.matched} matched · {r.total_on_chain_txs} on-chain · {r.total_database_records} in DB
                  </p>
                </Card>
              ))
            )}
          </div>

          <h2 className="mb-3 text-sm font-bold text-ink">History</h2>
          {!results || results.length === 0 ? (
            <EmptyState>No reconciliation history.</EmptyState>
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-border">
                  <th className={th}>Chain</th>
                  <th className={th}>Status</th>
                  <th className={th}>On-Chain Txs</th>
                  <th className={th}>DB Records</th>
                  <th className={th}>Matched</th>
                  <th className={th}>Discrepancies</th>
                  <th className={th}>Run At (GMT+4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className={`${td} text-ink-dim`}>{r.chain}</td>
                    <td className={td}>
                      <Badge tone={r.status === 'clean' ? 'green' : 'red'}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className={td}>
                      <Mono>{r.total_on_chain_txs}</Mono>
                    </td>
                    <td className={td}>
                      <Mono>{r.total_database_records}</Mono>
                    </td>
                    <td className={td}>
                      <Mono>{r.matched}</Mono>
                    </td>
                    <td className={td}>
                      {r.discrepancy_details && (r.discrepancy_details.unmatched_incoming.length > 0 || r.discrepancy_details.unmatched_records.length > 0) ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-red">
                            {r.unmatched_incoming + r.unmatched_records} tx
                          </summary>
                          <div className="mt-2 max-w-xs space-y-1 text-[11px]">
                            {r.discrepancy_details.unmatched_incoming.map((h) => (
                              <p key={h} className="truncate text-ink-dim">
                                incoming: <Mono>{h}</Mono>
                              </p>
                            ))}
                            {r.discrepancy_details.unmatched_records.map((h) => (
                              <p key={h} className="truncate text-ink-dim">
                                record: <Mono>{h}</Mono>
                              </p>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <span className="text-xs text-ink-faint">none</span>
                      )}
                    </td>
                    <td className={`${td} text-ink-dim`}>{formatDateGmt4(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </>
      )}
    </div>
  );
}
