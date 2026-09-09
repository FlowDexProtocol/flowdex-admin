'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import {
  bulkUpdateCmsPageFields,
  deleteCmsPageField,
  deleteCmsPageSection,
  getCmsPageContent,
  getCmsPages,
  setCmsPageField,
} from '@/lib/api';
import { Button, Card, EmptyState, ErrorNote, IconButton, Input, Label, LoadingBlock, Modal, PageHeader, Select, Textarea } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

const FALLBACK_PAGES = ['home', 'global', 'nav', 'tokenomics', 'roadmap', 'terms', 'privacy', 'legal', 'buy'];
const LONG_VALUE_THRESHOLD = 100;

// Section/page/field keys are addressed as "section.field" strings and
// stored in VARCHAR(50) columns — lowercase snake_case only, so a space
// typed anywhere becomes an underscore rather than a rejected character.
function toKeySlug(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

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
  canDelete,
  onSaved,
  onDeleteRequested,
}: {
  page: string;
  section: string;
  field: string;
  value: string;
  canDelete: boolean;
  onSaved: (section: string, field: string, value: string) => void;
  onDeleteRequested: (section: string, field: string) => void;
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
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => setEditing(true)}>
              Edit
            </Button>
            {canDelete && (
              <IconButton title="Delete field" variant="danger" onClick={() => onDeleteRequested(section, field)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            )}
          </div>
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
  canDelete,
  onSaved,
  onDeleteField,
  onDeleteSection,
}: {
  page: string;
  section: string;
  rows: { field: string; value: string }[];
  canDelete: boolean;
  onSaved: (section: string, field: string, value: string) => void;
  onDeleteField: (section: string, field: string) => void;
  onDeleteSection: (section: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <span className="text-sm font-semibold text-ink">{section}</span>
          <span className="text-xs text-ink-faint">
            {rows.length} field{rows.length === 1 ? '' : 's'}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {canDelete && (
            <IconButton title="Delete section" variant="danger" onClick={() => onDeleteSection(section)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          )}
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse section' : 'Expand section'}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className={`text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div>
          {rows.map((r) => (
            <EditableRow
              key={r.field}
              page={page}
              section={section}
              field={r.field}
              value={r.value}
              canDelete={canDelete}
              onSaved={onSaved}
              onDeleteRequested={onDeleteField}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Dynamic field/value list — shared by the Add Section and Add Page modals ──

interface DraftField {
  id: number;
  name: string;
  value: string;
}

function DynamicFieldRows({ rows, onChange }: { rows: DraftField[]; onChange: (rows: DraftField[]) => void }) {
  const idRef = useRef(0);

  function addRow() {
    idRef.current += 1;
    onChange([...rows, { id: idRef.current, name: '', value: '' }]);
  }
  function updateRow(id: number, patch: Partial<DraftField>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: number) {
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: toKeySlug(e.target.value) })}
              placeholder="field_name"
              className="font-mono text-xs"
              maxLength={50}
            />
            <Textarea
              rows={2}
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder="Value"
            />
          </div>
          <IconButton title="Remove field" variant="danger" onClick={() => removeRow(row.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addRow}>
        + Add Field
      </Button>
    </div>
  );
}

function AddSectionModal({
  open,
  onClose,
  page,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  page: string;
  onSaved: () => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [sectionName, setSectionName] = useState('');
  const [rows, setRows] = useState<DraftField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setSectionName('');
    setRows([]);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const section = toKeySlug(sectionName);
    if (!section) {
      setError('Section name is required.');
      return;
    }
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      setError('Add at least one field.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await adminFetch((t) => bulkUpdateCmsPageFields(t, validRows.map((r) => ({ page, section, field: r.name, value: r.value }))));
      showToast('success', 'Section added');
      onSaved();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add section';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Section">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Section Name</Label>
          <Input
            value={sectionName}
            onChange={(e) => setSectionName(toKeySlug(e.target.value))}
            placeholder="partners"
            className="font-mono"
            maxLength={50}
            autoFocus
            required
          />
        </div>
        <div>
          <Label>Fields</Label>
          <DynamicFieldRows rows={rows} onChange={setRows} />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Section'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddPageModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (page: string) => void }) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [pageName, setPageName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [rows, setRows] = useState<DraftField[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPageName('');
    setSectionName('');
    setRows([]);
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const page = toKeySlug(pageName);
    const section = toKeySlug(sectionName);
    if (!page) {
      setError('Page name is required.');
      return;
    }
    if (!section) {
      setError('Initial section name is required.');
      return;
    }
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      setError('Add at least one field.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await adminFetch((t) => bulkUpdateCmsPageFields(t, validRows.map((r) => ({ page, section, field: r.name, value: r.value }))));
      showToast('success', 'Page created');
      onSaved(page);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create page';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Page">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Page Name</Label>
          <Input
            value={pageName}
            onChange={(e) => setPageName(toKeySlug(e.target.value))}
            placeholder="new_page"
            className="font-mono"
            maxLength={50}
            autoFocus
            required
          />
        </div>
        <div>
          <Label>Initial Section Name</Label>
          <Input
            value={sectionName}
            onChange={(e) => setSectionName(toKeySlug(e.target.value))}
            placeholder="hero"
            className="font-mono"
            maxLength={50}
            required
          />
        </div>
        <div>
          <Label>Fields</Label>
          <DynamicFieldRows rows={rows} onChange={setRows} />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create Page'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function PageContentPage() {
  const { adminFetch, role } = useAdminAuth();
  const { showToast } = useToast();
  const isSuperAdmin = role === 'super_admin';

  const { data: pagesList, reload: reloadPages } = useFetch(() => adminFetch((t) => getCmsPages(t)), []);
  const pages = pagesList && pagesList.length > 0 ? pagesList : FALLBACK_PAGES;

  const [page, setPage] = useState(FALLBACK_PAGES[0]);
  const { data: content, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsPageContent(t, page)), [page]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<{ section: string; field: string } | null>(null);
  const [deletingField, setDeletingField] = useState(false);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState(false);

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

  async function handleSectionAdded() {
    setOverrides({});
    await reload();
  }

  async function handlePageCreated(newPage: string) {
    await reloadPages();
    handlePageChange(newPage);
  }

  async function handleDeleteField() {
    if (!deleteFieldTarget) return;
    setDeletingField(true);
    try {
      await adminFetch((t) => deleteCmsPageField(t, page, deleteFieldTarget.section, deleteFieldTarget.field));
      showToast('success', 'Field deleted');
      setDeleteFieldTarget(null);
      setOverrides({});
      await reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setDeletingField(false);
    }
  }

  async function handleDeleteSection() {
    if (!deleteSectionTarget) return;
    setDeletingSection(true);
    try {
      await adminFetch((t) => deleteCmsPageSection(t, page, deleteSectionTarget));
      showToast('success', 'Section deleted');
      setDeleteSectionTarget(null);
      setOverrides({});
      await reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete section');
    } finally {
      setDeletingSection(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Page Content"
        description="Edit any text block on the site without touching code."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href="https://flowdexprotocol.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-4 text-sm font-semibold text-ink transition-colors hover:border-primary/50"
            >
              Preview Site
            </a>
            <a
              href="https://purchase.flowdexprotocol.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-4 text-sm font-semibold text-ink transition-colors hover:border-primary/50"
            >
              Preview Buy Page
            </a>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="max-w-xs flex-1">
            <Label>Page</Label>
            <Select value={page} onChange={(e) => handlePageChange(e.target.value)}>
              {pages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="secondary" onClick={() => setAddPageOpen(true)}>
            + Add Page
          </Button>
        </div>
      </Card>

      {loading && !content ? (
        <LoadingBlock />
      ) : error && !content ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <div className="space-y-3">
          {sections.length === 0 ? (
            <EmptyState>No content fields set for &ldquo;{page}&rdquo; yet.</EmptyState>
          ) : (
            sections.map(([section, rows]) => (
              <SectionGroup
                key={section}
                page={page}
                section={section}
                rows={rows}
                canDelete={isSuperAdmin}
                onSaved={handleSaved}
                onDeleteField={(s, field) => setDeleteFieldTarget({ section: s, field })}
                onDeleteSection={(s) => setDeleteSectionTarget(s)}
              />
            ))
          )}
          <Button type="button" variant="secondary" onClick={() => setAddSectionOpen(true)}>
            + Add Section
          </Button>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        Changes save immediately per field.{' '}
        <button onClick={() => reload()} className="text-primary hover:underline">
          Refresh from server
        </button>
      </p>

      <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} page={page} onSaved={handleSectionAdded} />
      <AddPageModal open={addPageOpen} onClose={() => setAddPageOpen(false)} onSaved={handlePageCreated} />

      <ConfirmDialog
        open={!!deleteFieldTarget}
        message="Delete this field? This cannot be undone."
        busy={deletingField}
        onConfirm={handleDeleteField}
        onCancel={() => setDeleteFieldTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteSectionTarget}
        message="Delete all fields in this section? This cannot be undone."
        busy={deletingSection}
        onConfirm={handleDeleteSection}
        onCancel={() => setDeleteSectionTarget(null)}
      />
    </div>
  );
}
