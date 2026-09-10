'use client';

// ══════════════════════════════════════════════════
// src/app/(admin)/cms/editor/page.tsx
// Side-by-side visual page editor — left panel previews the real live site
// in an iframe, right panel edits the CMS fields backing whatever's
// selected, auto-refreshing the preview after every save.
//
// Not every previewable page has its own cms_pages namespace: FAQs and
// blog posts live in their own tables (cms_faqs / cms_blog_posts), and a
// few pages (About, How to Buy) are mostly fixed copy that only reads
// "global" for shared bits (logo, social, support email). Those show a
// pointer to the right dedicated admin page instead of a fake empty editor.
// ══════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { bulkUpdateCmsPageFields, deleteCmsPageField, deleteCmsPageSection, getCmsPageContent, setCmsPageField } from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  IconButton,
  Input,
  Label,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from '@/components/ui';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';

const SITE_URL = 'https://flowdexprotocol.com';
const BUY_URL = 'https://purchase.flowdexprotocol.com';
const LONG_VALUE_THRESHOLD = 100;

function toKeySlug(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

interface PreviewPageOption {
  key: string;
  label: string;
  previewUrl: string;
  cmsPage: string | null;
  note?: string;
}

const PREVIEW_PAGES: PreviewPageOption[] = [
  { key: 'home', label: 'Home', previewUrl: SITE_URL, cmsPage: 'home' },
  { key: 'global', label: 'Global (Logo, Footer, Social)', previewUrl: SITE_URL, cmsPage: 'global' },
  { key: 'nav', label: 'Navigation', previewUrl: SITE_URL, cmsPage: 'nav' },
  { key: 'tokenomics', label: 'Tokenomics', previewUrl: `${SITE_URL}/tokenomics`, cmsPage: 'tokenomics' },
  { key: 'roadmap', label: 'Roadmap', previewUrl: `${SITE_URL}/roadmap`, cmsPage: 'roadmap' },
  {
    key: 'about',
    label: 'About',
    previewUrl: `${SITE_URL}/about`,
    cmsPage: null,
    note: 'This page is mostly fixed copy. Social links & logo: edit "Global" above. Team members: use the Team page.',
  },
  { key: 'faq', label: 'FAQ', previewUrl: `${SITE_URL}/faq`, cmsPage: null, note: 'FAQs are managed on the dedicated FAQs page.' },
  { key: 'blog', label: 'Blog', previewUrl: `${SITE_URL}/blogs`, cmsPage: null, note: 'Blog posts are managed on the dedicated Blog page.' },
  {
    key: 'how-to-buy',
    label: 'How to Buy',
    previewUrl: `${SITE_URL}/how-to-buy`,
    cmsPage: 'global',
    note: "This page's steps are fixed copy — only shared Global fields (support email, etc.) are editable here.",
  },
  { key: 'terms', label: 'Terms', previewUrl: `${SITE_URL}/terms`, cmsPage: 'terms' },
  { key: 'privacy', label: 'Privacy', previewUrl: `${SITE_URL}/privacy`, cmsPage: 'privacy' },
  { key: 'legal', label: 'Legal', previewUrl: `${SITE_URL}/legal`, cmsPage: 'legal' },
  { key: 'buy', label: 'Buy Page', previewUrl: BUY_URL, cmsPage: 'buy' },
];

// ── Preview panel ──

function PreviewPanel({
  option,
  device,
  onDeviceChange,
  nonce,
  onRefresh,
}: {
  option: PreviewPageOption;
  device: 'desktop' | 'mobile';
  onDeviceChange: (d: 'desktop' | 'mobile') => void;
  nonce: number;
  onRefresh: () => void;
}) {
  const w = device === 'mobile' ? 390 : 1440;
  const h = device === 'mobile' ? 1600 : 2000;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => onDeviceChange('desktop')}
            className={`flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
              device === 'desktop' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'
            }`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => onDeviceChange('mobile')}
            className={`flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors ${
              device === 'mobile' ? 'bg-primary text-[#03131a]' : 'text-ink-dim hover:text-ink'
            }`}
          >
            Mobile
          </button>
        </div>
        <Button variant="secondary" className="!min-h-9 !px-3 text-xs" onClick={onRefresh}>
          ↻ Refresh Preview
        </Button>
      </div>

      <div className="overflow-auto rounded-xl border border-border bg-white" style={{ maxHeight: '75vh' }}>
        <div style={{ width: w / 2, height: h / 2, overflow: 'hidden' }}>
          <iframe
            key={`${option.previewUrl}-${nonce}`}
            src={option.previewUrl}
            title="Live site preview"
            style={{ width: w, height: h, border: 'none', transform: 'scale(0.5)', transformOrigin: 'top left' }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Previewing{' '}
        <a href={option.previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {option.previewUrl}
        </a>{' '}
        at 50% scale. If the preview stays blank, the target site may not allow being framed — open the link above directly instead.
      </p>
    </div>
  );
}

// ── Generic field row/section (same pattern as /cms/pages) ──

function fieldEditor(draft: string, setDraft: (v: string) => void) {
  const useTextarea = draft.length >= LONG_VALUE_THRESHOLD || draft.includes(',');
  if (!useTextarea) return <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
  return <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
}

function EditableFieldRow({
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
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await adminFetch((t) => setCmsPageField(t, page, section, field, draft));
      showToast('success', 'Field saved');
      onSaved(section, field, draft);
      setEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  }

  const preview = value.length > 60 ? `${value.slice(0, 60)}…` : value;

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-xs text-ink-faint">{field}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {justSaved && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green" aria-hidden="true">
              <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {!editing && (
            <>
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
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {fieldEditor(draft, setDraft)}
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

// ── Logo special editor (global.logo section) ──

function LogoEditor({
  page,
  rows,
  onSaved,
}: {
  page: string;
  rows: { field: string; value: string }[];
  onSaved: (section: string, field: string, value: string) => void;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const byField = useMemo(() => Object.fromEntries(rows.map((r) => [r.field, r.value])), [rows]);
  const [type, setType] = useState(byField.type || 'text');
  const [textMain, setTextMain] = useState(byField.text_main || '');
  const [textAccent, setTextAccent] = useState(byField.text_accent || '');
  const [imageUrl, setImageUrl] = useState(byField.image_url || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setType(byField.type || 'text');
    setTextMain(byField.text_main || '');
    setTextAccent(byField.text_accent || '');
    setImageUrl(byField.image_url || '');
  }, [byField]);

  async function saveField(field: string, value: string) {
    await adminFetch((t) => setCmsPageField(t, page, 'logo', field, value));
    onSaved('logo', field, value);
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      await saveField('type', type);
      if (type === 'text') {
        await saveField('text_main', textMain);
        await saveField('text_accent', textAccent);
      } else {
        await saveField('image_url', imageUrl);
      }
      showToast('success', 'Logo saved');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save logo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-border px-4 py-4 first:border-t-0">
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-bg-soft p-4">
        {type === 'image' && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-8 w-auto object-contain" />
        ) : (
          <span className="text-xl font-bold">
            <span className="text-ink">{textMain || 'Flow'}</span>
            <span className="text-primary">{textAccent || 'Dex'}</span>
          </span>
        )}
        <span className="ml-auto text-xs text-ink-faint">Live preview</span>
      </div>

      <Toggle checked={type === 'image'} onChange={(v) => setType(v ? 'image' : 'text')} label={type === 'image' ? 'Image Logo' : 'Text Logo'} />

      {type === 'text' ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label>Text (main)</Label>
            <Input value={textMain} onChange={(e) => setTextMain(e.target.value)} />
          </div>
          <div>
            <Label>Text (accent)</Label>
            <Input value={textAccent} onChange={(e) => setTextAccent(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <ImageUploader label="Logo Image" value={imageUrl} onChange={setImageUrl} />
        </div>
      )}

      <Button className="mt-4 !min-h-0 !px-4 !py-2 text-xs" disabled={saving} onClick={handleSaveAll}>
        {saving ? 'Saving…' : 'Save Logo'}
      </Button>
    </div>
  );
}

// ── Navigation special editor (nav.header link_N_* pairs) ──

function NavLinksEditor({ page, rows, onSaved }: { page: string; rows: { field: string; value: string }[]; onSaved: () => void }) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const links = useMemo(() => {
    const byIndex = new Map<number, { text: string; url: string }>();
    for (const r of rows) {
      const m = r.field.match(/^link_(\d+)_(text|url)$/);
      if (!m) continue;
      const idx = parseInt(m[1], 10);
      const entry = byIndex.get(idx) ?? { text: '', url: '' };
      entry[m[2] as 'text' | 'url'] = r.value;
      byIndex.set(idx, entry);
    }
    return Array.from(byIndex.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([index, v]) => ({ index, ...v }));
  }, [rows]);

  const otherRows = rows.filter((r) => !/^link_\d+_(text|url)$/.test(r.field));

  async function swap(i: number, j: number) {
    if (i < 0 || j < 0 || i >= links.length || j >= links.length) return;
    setBusyIndex(links[i].index);
    try {
      const a = links[i];
      const b = links[j];
      await adminFetch((t) =>
        bulkUpdateCmsPageFields(t, [
          { page, section: 'header', field: `link_${a.index}_text`, value: b.text },
          { page, section: 'header', field: `link_${a.index}_url`, value: b.url },
          { page, section: 'header', field: `link_${b.index}_text`, value: a.text },
          { page, section: 'header', field: `link_${b.index}_url`, value: a.url },
        ])
      );
      showToast('success', 'Reordered');
      onSaved();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setBusyIndex(null);
    }
  }

  async function handleEdit(index: number, text: string, url: string) {
    setBusyIndex(index);
    try {
      await adminFetch((t) =>
        bulkUpdateCmsPageFields(t, [
          { page, section: 'header', field: `link_${index}_text`, value: text },
          { page, section: 'header', field: `link_${index}_url`, value: url },
        ])
      );
      showToast('success', 'Link saved');
      onSaved();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save link');
    } finally {
      setBusyIndex(null);
    }
  }

  async function handleReset(index: number) {
    await handleEdit(index, '', '');
  }

  return (
    <div className="border-t border-border px-4 py-4 first:border-t-0">
      <p className="mb-3 text-xs text-ink-faint">
        These fixed nav slots map 1:1 to the site header — reordering and editing work live. Resetting a link clears it back to
        the site&rsquo;s built-in default for that position (this fixed-slot layout can&rsquo;t grow past what&rsquo;s already here).
      </p>
      <div className="space-y-2">
        {links.map((link, i) => (
          <NavLinkRow
            key={link.index}
            link={link}
            busy={busyIndex === link.index}
            onMoveUp={() => swap(i, i - 1)}
            onMoveDown={() => swap(i, i + 1)}
            onSave={(text, url) => handleEdit(link.index, text, url)}
            onReset={() => handleReset(link.index)}
          />
        ))}
      </div>
      {otherRows.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-faint">Other Header Fields</p>
          {otherRows.map((r) => (
            <EditableFieldRow key={r.field} page={page} section="header" field={r.field} value={r.value} canDelete={false} onSaved={() => onSaved()} onDeleteRequested={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinkRow({
  link,
  busy,
  onMoveUp,
  onMoveDown,
  onSave,
  onReset,
}: {
  link: { index: number; text: string; url: string };
  busy: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (text: string, url: string) => void;
  onReset: () => void;
}) {
  const [text, setText] = useState(link.text);
  const [url, setUrl] = useState(link.url);
  useEffect(() => {
    setText(link.text);
    setUrl(link.url);
  }, [link.text, link.url]);
  const dirty = text !== link.text || url !== link.url;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2.5">
      <div className="flex flex-col gap-0.5">
        <IconButton title="Move up" onClick={onMoveUp}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
        <IconButton title="Move down" onClick={onMoveDown}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
      </div>
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Label" className="flex-1" disabled={busy} />
      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/url" className="flex-1 font-mono text-xs" disabled={busy} />
      {dirty && (
        <Button className="!min-h-0 shrink-0 !px-3 !py-2 text-xs" disabled={busy} onClick={() => onSave(text, url)}>
          Save
        </Button>
      )}
      <IconButton title="Reset to default" variant="danger" onClick={onReset}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IconButton>
    </div>
  );
}

// ── Dynamic field/value list for Add Section modal ──

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
            <Input value={row.name} onChange={(e) => updateRow(row.id, { name: toKeySlug(e.target.value) })} placeholder="field_name" className="font-mono text-xs" maxLength={50} />
            <Textarea rows={2} value={row.value} onChange={(e) => updateRow(row.id, { value: e.target.value })} placeholder="Value" />
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

function AddSectionModal({ open, onClose, page, onSaved }: { open: boolean; onClose: () => void; page: string; onSaved: () => void }) {
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
          <Label required>Section Name</Label>
          <Input value={sectionName} onChange={(e) => setSectionName(toKeySlug(e.target.value))} placeholder="partners" className="font-mono" maxLength={50} autoFocus />
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

// ── Page-level section group wrapper ──

function EditorSectionGroup({
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
  const isLogo = page === 'global' && section === 'logo';
  const isNavHeader = page === 'nav' && section === 'header';

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <span className="text-sm font-semibold text-ink">{section}</span>
          <span className="text-xs text-ink-faint">
            {rows.length} field{rows.length === 1 ? '' : 's'}
          </span>
          {isLogo && <Badge tone="primary">Logo</Badge>}
          {isNavHeader && <Badge tone="primary">Nav Links</Badge>}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {canDelete && !isLogo && !isNavHeader && (
            <IconButton title="Delete section" variant="danger" onClick={() => onDeleteSection(section)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          )}
          <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Collapse section' : 'Expand section'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`text-ink-faint transition-transform ${open ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {open &&
        (isLogo ? (
          <LogoEditor page={page} rows={rows} onSaved={onSaved} />
        ) : isNavHeader ? (
          <NavLinksEditor page={page} rows={rows} onSaved={() => onSaved(section, '', '')} />
        ) : (
          <div>
            {rows.map((r) => (
              <EditableFieldRow key={r.field} page={page} section={section} field={r.field} value={r.value} canDelete={canDelete} onSaved={onSaved} onDeleteRequested={onDeleteField} />
            ))}
          </div>
        ))}
    </Card>
  );
}

// ── Main page ──

export default function VisualPageEditorPage() {
  const { adminFetch, role } = useAdminAuth();
  const isSuperAdmin = role === 'super_admin';

  const [selectedKey, setSelectedKey] = useState(PREVIEW_PAGES[0].key);
  const option = PREVIEW_PAGES.find((p) => p.key === selectedKey) ?? PREVIEW_PAGES[0];
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [iframeNonce, setIframeNonce] = useState(0);

  const cmsPage = option.cmsPage;
  const { data: content, loading, error, reload } = useFetch(
    () => (cmsPage ? adminFetch((t) => getCmsPageContent(t, cmsPage)) : Promise.resolve({})),
    [cmsPage]
  );
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [deleteFieldTarget, setDeleteFieldTarget] = useState<{ section: string; field: string } | null>(null);
  const [deletingField, setDeletingField] = useState(false);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState(false);

  function refreshPreview() {
    setIframeNonce((n) => n + 1);
  }

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

  function handleSelectChange(key: string) {
    setSelectedKey(key);
    setOverrides({});
  }

  async function handleFieldSaved(section: string, field: string, value: string) {
    if (field) setOverrides((prev) => ({ ...prev, [`${section}.${field}`]: value }));
    refreshPreview();
    await reload();
  }

  async function handleSectionAdded() {
    setOverrides({});
    refreshPreview();
    await reload();
  }

  async function handleDeleteField() {
    if (!deleteFieldTarget || !cmsPage) return;
    setDeletingField(true);
    try {
      await adminFetch((t) => deleteCmsPageField(t, cmsPage, deleteFieldTarget.section, deleteFieldTarget.field));
      setDeleteFieldTarget(null);
      setOverrides({});
      refreshPreview();
      await reload();
    } finally {
      setDeletingField(false);
    }
  }

  async function handleDeleteSection() {
    if (!deleteSectionTarget || !cmsPage) return;
    setDeletingSection(true);
    try {
      await adminFetch((t) => deleteCmsPageSection(t, cmsPage, deleteSectionTarget));
      setDeleteSectionTarget(null);
      setOverrides({});
      refreshPreview();
      await reload();
    } finally {
      setDeletingSection(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Page Editor"
        description="Edit CMS content and see the live site update side by side."
        action={
          <Link href="/cms/banners" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card-hover px-4 text-sm font-semibold text-ink transition-colors hover:border-primary/50">
            Edit Banners →
          </Link>
        }
      />

      <Card className="mb-6 max-w-sm">
        <Label>Page</Label>
        <Select value={selectedKey} onChange={(e) => handleSelectChange(e.target.value)}>
          {PREVIEW_PAGES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <PreviewPanel option={option} device={device} onDeviceChange={setDevice} nonce={iframeNonce} onRefresh={refreshPreview} />
        </div>

        <div>
          {!cmsPage ? (
            <Card>
              <EmptyState>
                <p>{option.note || 'This page has no directly editable CMS fields.'}</p>
              </EmptyState>
            </Card>
          ) : (
            <>
              {option.note && (
                <Card className="mb-4 !py-3">
                  <p className="text-xs text-ink-dim">{option.note}</p>
                </Card>
              )}
              {loading && !content ? (
                <LoadingBlock />
              ) : error && !content ? (
                <ErrorNote>{error}</ErrorNote>
              ) : (
                <div className="space-y-3">
                  {sections.length === 0 ? (
                    <EmptyState>No content fields set for &ldquo;{cmsPage}&rdquo; yet.</EmptyState>
                  ) : (
                    sections.map(([section, rows]) => (
                      <EditorSectionGroup
                        key={section}
                        page={cmsPage}
                        section={section}
                        rows={rows}
                        canDelete={isSuperAdmin}
                        onSaved={handleFieldSaved}
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
            </>
          )}
        </div>
      </div>

      {cmsPage && <AddSectionModal open={addSectionOpen} onClose={() => setAddSectionOpen(false)} page={cmsPage} onSaved={handleSectionAdded} />}

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
