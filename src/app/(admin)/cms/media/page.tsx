'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { createCmsMedia, deleteCmsMedia, getCmsMedia } from '@/lib/api';
import type { CmsMedia, CmsMediaPayload } from '@/lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, IconButton, Input, Label, LoadingBlock, Modal, PageHeader, Select } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

const TYPES = ['logo', 'screenshot', 'graphic', 'icon'];
const CATEGORIES = ['press', 'partner', 'product', 'general'];

const EMPTY_FORM: CmsMediaPayload = { name: '', type: 'logo', url: '', alt_text: '', category: 'general' };

export default function MediaPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const { data: media, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsMedia(t)), []);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CmsMediaPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsMedia | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => (categoryFilter ? (media ?? []).filter((m) => m.category === categoryFilter) : media ?? []), [media, categoryFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) {
      setFormError('Name and URL are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminFetch((t) => createCmsMedia(t, form));
      showToast('success', 'Media created');
      setModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save media';
      setFormError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch((t) => deleteCmsMedia(t, deleteTarget.id));
      showToast('success', 'Media deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete media');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Media" description="Logos, screenshots, and graphics used across the site." action={<Button onClick={openCreate}>Add Media</Button>} />

      <div className="mb-6 max-w-[220px]">
        <Label>Filter by category</Label>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {loading && !media ? (
        <LoadingBlock />
      ) : error && !media ? (
        <ErrorNote>{error}</ErrorNote>
      ) : filtered.length === 0 ? (
        <EmptyState>No media items match this filter.</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <Card key={item.id} className="!p-3">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-card-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt_text || item.name} className="h-full w-full object-contain" />
              </div>
              <p className="mt-2 truncate text-sm font-medium text-ink">{item.name}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge tone="neutral">{item.type}</Badge>
                <Badge tone="primary">{item.category}</Badge>
              </div>
              <div className="mt-2 flex justify-end">
                <IconButton title="Delete" variant="danger" onClick={() => setDeleteTarget(item)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Media">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>URL</Label>
            <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" required />
          </div>
          <div>
            <Label>Alt Text</Label>
            <Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
          </div>
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create Media'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
