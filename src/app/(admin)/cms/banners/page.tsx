'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { createCmsBanner, deleteCmsBanner, getCmsBanners, reorderCmsBanners, updateCmsBanner } from '@/lib/api';
import type { CmsBanner, CmsBannerPayload } from '@/lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  IconButton,
  Input,
  Label,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  TableShell,
  Toggle,
  td,
  th,
} from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

const BG_STYLES = ['gradient', 'gradient-purple', 'gradient-cyan'];

const EMPTY_FORM: CmsBannerPayload = {
  title: '',
  subtitle: '',
  cta_text: '',
  cta_link: '',
  image_url_desktop: '',
  image_url_mobile: '',
  countdown_end: '',
  show_countdown: false,
  bg_color: '',
  bg_style: 'gradient',
  is_active: true,
};

// <input type="datetime-local"> works in local time with no timezone
// suffix — converting to/from the ISO string the API stores.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function looksLikeUrl(value: string | undefined): boolean {
  return !!value && /^https?:\/\//.test(value);
}

function BannerPreview({ form }: { form: CmsBannerPayload }) {
  const bgImage = looksLikeUrl(form.image_url_desktop) ? form.image_url_desktop : undefined;
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border p-5"
      style={{
        background: bgImage ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${bgImage}) center/cover` : form.bg_color || undefined,
      }}
    >
      {!bgImage && !form.bg_color && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple/20" />
      )}
      <div className="relative">
        <p className="text-sm font-bold text-white">{form.title || 'Banner title'}</p>
        {form.subtitle && <p className="mt-1 text-xs text-white/80">{form.subtitle}</p>}
        {form.cta_text && (
          <span className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#03131a]">
            {form.cta_text}
          </span>
        )}
        {form.show_countdown && form.countdown_end && (
          <p className="mt-2 font-mono text-xs text-white/90">Countdown: {new Date(form.countdown_end).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value ?? ''}
        onChange={(e) => {
          setBroken(false);
          onChange(e.target.value);
        }}
        placeholder="https://…"
      />
      {looksLikeUrl(value) && !broken && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 h-16 w-auto rounded border border-border object-cover"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}

export default function BannersPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const { data: banners, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsBanners(t)), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CmsBanner | null>(null);
  const [form, setForm] = useState<CmsBannerPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsBanner | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(banner: CmsBanner) {
    setEditing(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      cta_text: banner.cta_text ?? '',
      cta_link: banner.cta_link ?? '',
      image_url_desktop: banner.image_url_desktop ?? '',
      image_url_mobile: banner.image_url_mobile ?? '',
      countdown_end: banner.countdown_end ?? '',
      show_countdown: banner.show_countdown,
      bg_color: banner.bg_color ?? '',
      bg_style: banner.bg_style,
      is_active: banner.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await adminFetch((t) => updateCmsBanner(t, editing.id, form));
        showToast('success', 'Banner updated');
      } else {
        await adminFetch((t) => createCmsBanner(t, form));
        showToast('success', 'Banner created');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save banner';
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
      await adminFetch((t) => deleteCmsBanner(t, deleteTarget.id));
      showToast('success', 'Banner deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete banner');
    } finally {
      setDeleting(false);
    }
  }

  const move = useCallback(
    async (index: number, direction: -1 | 1) => {
      if (!banners) return;
      const target = index + direction;
      if (target < 0 || target >= banners.length) return;
      const reordered = [...banners];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setReordering(true);
      try {
        await adminFetch((t) => reorderCmsBanners(t, reordered.map((b) => b.id)));
        showToast('success', 'Banners reordered');
        reload();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to reorder banners');
      } finally {
        setReordering(false);
      }
    },
    [banners, adminFetch, reload, showToast]
  );

  return (
    <div>
      <PageHeader title="Banners" description="Landing page carousel slides." action={<Button onClick={openCreate}>Add Banner</Button>} />

      {loading && !banners ? (
        <LoadingBlock />
      ) : error && !banners ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !banners || banners.length === 0 ? (
        <EmptyState>No banners yet — create one to get started.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>ID</th>
              <th className={th}>Title</th>
              <th className={th}>Subtitle</th>
              <th className={th}>CTA Text</th>
              <th className={th}>CTA Link</th>
              <th className={th}>Media</th>
              <th className={th}>Sort</th>
              <th className={th}>Active</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {banners.map((b, i) => (
              <tr key={b.id}>
                <td className={`${td} text-ink-faint`}>{b.id}</td>
                <td className={`${td} font-medium text-ink`}>{b.title}</td>
                <td className={`${td} max-w-[200px] truncate text-ink-dim`}>{b.subtitle || '—'}</td>
                <td className={`${td} text-ink-dim`}>{b.cta_text || '—'}</td>
                <td className={`${td} max-w-[160px] truncate text-ink-dim`}>{b.cta_link || '—'}</td>
                <td className={td}>
                  <div className="flex items-center gap-1">
                    {(b.image_url_desktop || b.image_url_mobile) && <Badge tone="purple">Image</Badge>}
                    {b.show_countdown && b.countdown_end && <Badge tone="primary">Countdown</Badge>}
                    {!b.image_url_desktop && !b.image_url_mobile && !(b.show_countdown && b.countdown_end) && (
                      <span className="text-ink-faint">—</span>
                    )}
                  </div>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1">
                    <IconButton title="Move up" onClick={() => move(i, -1)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </IconButton>
                    <IconButton title="Move down" onClick={() => move(i, 1)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </IconButton>
                  </div>
                </td>
                <td className={td}>
                  <Badge tone={b.is_active ? 'green' : 'neutral'}>{b.is_active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <IconButton title="Edit" onClick={() => openEdit(b)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </IconButton>
                    <IconButton title="Delete" variant="danger" onClick={() => setDeleteTarget(b)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {reordering && <p className="mt-2 text-xs text-ink-faint">Saving order…</p>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Banner' : 'Add Banner'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <BannerPreview form={form} />

          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CTA Text</Label>
              <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            </div>
            <div>
              <Label>CTA Link</Label>
              <Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} />
            </div>
          </div>

          <ImageField
            label="Desktop Image URL"
            value={form.image_url_desktop}
            onChange={(v) => setForm({ ...form, image_url_desktop: v })}
          />
          <ImageField
            label="Mobile Image URL"
            value={form.image_url_mobile}
            onChange={(v) => setForm({ ...form, image_url_mobile: v })}
          />

          <div>
            <Label>Countdown Ends</Label>
            <Input
              type="datetime-local"
              value={isoToLocalInput(form.countdown_end)}
              onChange={(e) => setForm({ ...form, countdown_end: localInputToIso(e.target.value) })}
            />
            <div className="mt-2">
              <Toggle checked={!!form.show_countdown} onChange={(v) => setForm({ ...form, show_countdown: v })} label="Show countdown" />
            </div>
          </div>

          <div>
            <Label>Background Color</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.bg_color}
                onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                placeholder="#627EEA"
                className="flex-1"
              />
              <span
                className="h-11 w-11 shrink-0 rounded-lg border border-border"
                style={{ background: form.bg_color || 'transparent' }}
              />
            </div>
          </div>

          <div>
            <Label>Background Style (used when no image is set)</Label>
            <Select value={form.bg_style} onChange={(e) => setForm({ ...form, bg_style: e.target.value })}>
              {BG_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <Toggle checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Delete banner "${deleteTarget?.title}"? This can't be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
