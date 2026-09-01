'use client';

import { useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { getCmsPageContent, setCmsPageField } from '@/lib/api';
import { Button, Card, EmptyState, ErrorNote, Label, LoadingBlock, PageHeader, Select, TableShell, Textarea, td, th } from '@/components/ui';

const PAGES = ['home', 'tokenomics', 'roadmap'];

function EditableRow({
  page,
  section,
  field,
  value,
  onSaved,
}: {
  page: string;
  section: string;
  field: string;
  value: string;
  onSaved: (section: string, field: string, value: string) => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await adminFetch((t) => setCmsPageField(t, page, section, field, draft));
      showToast('success', 'Page content updated');
      onSaved(section, field, draft);
      setEditing(false);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update page content');
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="align-top">
      <td className={`${td} whitespace-nowrap text-ink-dim`}>{section}</td>
      <td className={`${td} whitespace-nowrap font-mono text-xs text-ink-dim`}>{field}</td>
      <td className={td}>
        {editing ? (
          <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-w-[280px]" autoFocus />
        ) : (
          <p className="max-w-md whitespace-pre-wrap text-ink">{value}</p>
        )}
      </td>
      <td className={td}>
        {editing ? (
          <div className="flex gap-1.5">
            <Button className="!px-3 !py-1.5 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? '…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 text-xs"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function PageContentPage() {
  const { adminFetch } = useAdminAuth();
  const [page, setPage] = useState(PAGES[0]);
  const { data: content, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsPageContent(t, page)), [page]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const merged: Record<string, string> = { ...(content ?? {}), ...overrides };
    return Object.entries(merged)
      .map(([key, value]) => {
        const idx = key.indexOf('.');
        return { key, section: key.slice(0, idx), field: key.slice(idx + 1), value };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [content, overrides]);

  function handleSaved(section: string, field: string, value: string) {
    setOverrides((prev) => ({ ...prev, [`${section}.${field}`]: value }));
  }

  function handlePageChange(next: string) {
    setPage(next);
    setOverrides({});
  }

  return (
    <div>
      <PageHeader title="Page Content" description="Edit any text block on the site without touching code." />

      <Card className="mb-6 max-w-xs">
        <Label>Page</Label>
        <Select value={page} onChange={(e) => handlePageChange(e.target.value)}>
          {PAGES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Card>

      {loading && !content ? (
        <LoadingBlock />
      ) : error && !content ? (
        <ErrorNote>{error}</ErrorNote>
      ) : rows.length === 0 ? (
        <EmptyState>No content fields set for &ldquo;{page}&rdquo; yet.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Section</th>
              <th className={th}>Field</th>
              <th className={th}>Value</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <EditableRow key={row.key} page={page} section={row.section} field={row.field} value={row.value} onSaved={handleSaved} />
            ))}
          </tbody>
        </TableShell>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        Changes save immediately per field.{' '}
        <button onClick={() => reload()} className="text-primary hover:underline">
          Refresh from server
        </button>
      </p>
    </div>
  );
}
