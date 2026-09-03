'use client';

import { useMemo, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { getCmsPageContent, getCmsPages, setCmsPageField } from '@/lib/api';
import { Button, Card, EmptyState, ErrorNote, Input, Label, LoadingBlock, PageHeader, Select, Textarea } from '@/components/ui';

const FALLBACK_PAGES = ['home', 'tokenomics', 'roadmap'];
const LONG_VALUE_THRESHOLD = 100;

function fieldEditor(value: string, draft: string, setDraft: (v: string) => void) {
  const useTextarea = draft.length >= LONG_VALUE_THRESHOLD || draft.includes(',');
  if (!useTextarea) {
    return <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
  }
  return (
    <div>
      <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      {draft.includes(',') && <p className="mt-1 text-xs text-ink-faint">Separate items with commas</p>}
    </div>
  );
}

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

  const preview = value.length > 60 ? `${value.slice(0, 60)}…` : value;

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs text-ink-faint">{field}</p>
        {!editing && (
          <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {fieldEditor(value, draft, setDraft)}
          <div className="flex gap-1.5">
            <Button className="!min-h-0 !px-3 !py-1.5 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              className="!min-h-0 !px-3 !py-1.5 text-xs"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{preview || <span className="text-ink-faint">—</span>}</p>
      )}
    </div>
  );
}

function SectionGroup({
  page,
  section,
  rows,
  onSaved,
}: {
  page: string;
  section: string;
  rows: { field: string; value: string }[];
  onSaved: (section: string, field: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-ink">{section}</span>
        <span className="flex items-center gap-2 text-xs text-ink-faint">
          {rows.length} field{rows.length === 1 ? '' : 's'}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div>
          {rows.map((r) => (
            <EditableRow key={r.field} page={page} section={section} field={r.field} value={r.value} onSaved={onSaved} />
          ))}
        </div>
      )}
    </Card>
  );
}

export default function PageContentPage() {
  const { adminFetch } = useAdminAuth();
  const { data: pagesList } = useFetch(() => adminFetch((t) => getCmsPages(t)), []);
  const pages = pagesList && pagesList.length > 0 ? pagesList : FALLBACK_PAGES;

  const [page, setPage] = useState(FALLBACK_PAGES[0]);
  const { data: content, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsPageContent(t, page)), [page]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const sections = useMemo(() => {
    const merged: Record<string, string> = { ...(content ?? {}), ...overrides };
    const grouped = new Map<string, { field: string; value: string }[]>();
    for (const [key, value] of Object.entries(merged)) {
      const idx = key.indexOf('.');
      const section = key.slice(0, idx);
      const field = key.slice(idx + 1);
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push({ field, value });
    }
    for (const rows of grouped.values()) rows.sort((a, b) => a.field.localeCompare(b.field));
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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
          {pages.map((p) => (
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
      ) : sections.length === 0 ? (
        <EmptyState>No content fields set for &ldquo;{page}&rdquo; yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {sections.map(([section, rows]) => (
            <SectionGroup key={section} page={page} section={section} rows={rows} onSaved={handleSaved} />
          ))}
        </div>
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
