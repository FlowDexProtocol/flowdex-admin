'use client';

// ══════════════════════════════════════════════════
// src/components/CmsFieldEditor.tsx
// One CMS field's list-row: shows its current value (type-aware — a
// thumbnail for image/media, a swatch for color, a link for url, "Not set"
// when empty), and expands into the right input widget on Edit. Shared by
// /cms/pages and /cms/editor so both editors render fields identically.
// ══════════════════════════════════════════════════

import { useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { setCmsPageField } from '@/lib/api';
import type { CmsFieldType } from '@/lib/types';
import { Button, IconButton, Input, Textarea } from './ui';
import ImageUploader, { MediaPreview } from './ImageUploader';

const LONG_VALUE_THRESHOLD = 100;
const LIST_PREVIEW_LENGTH = 80;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function ArrowUpIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green" aria-hidden="true">
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldTypeInput({ fieldType, draft, setDraft }: { fieldType: CmsFieldType; draft: string; setDraft: (v: string) => void }) {
  switch (fieldType) {
    case 'textarea':
      return <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
    case 'number':
      return <Input type="number" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={HEX_COLOR_RE.test(draft) ? draft : '#000000'}
            onChange={(e) => setDraft(e.target.value)}
            className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
          />
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="#00e5ff" className="font-mono" autoFocus />
        </div>
      );
    case 'url':
      return (
        <div className="flex items-center gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://…" className="font-mono text-xs" autoFocus />
          {draft && (
            <a href={draft} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-primary hover:underline">
              Open ↗
            </a>
          )}
        </div>
      );
    case 'image':
      return <ImageUploader value={draft} onChange={setDraft} kind="image" />;
    case 'media':
      return <ImageUploader value={draft} onChange={setDraft} kind="media" />;
    case 'text':
    default: {
      const useTextarea = draft.length >= LONG_VALUE_THRESHOLD || draft.includes(',');
      if (useTextarea) {
        return (
          <div>
            <Textarea rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            {draft.includes(',') && <p className="mt-1 text-xs text-ink-faint">Separate items with commas</p>}
          </div>
        );
      }
      return <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />;
    }
  }
}

function FieldValueDisplay({ fieldType, value }: { fieldType: CmsFieldType; value: string }) {
  if (!value) return <span className="text-sm text-ink-faint">Not set</span>;

  if (fieldType === 'image' || fieldType === 'media') {
    return (
      <span className="flex items-center gap-2">
        <MediaPreview value={value} className="h-10 w-10 shrink-0 rounded-md border border-border object-cover" />
        <span className="truncate font-mono text-xs text-ink-faint">{value}</span>
      </span>
    );
  }

  if (fieldType === 'color') {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 rounded border border-border" style={{ background: value }} />
        <span className="font-mono text-xs text-ink">{value}</span>
      </span>
    );
  }

  const preview = value.length > LIST_PREVIEW_LENGTH ? `${value.slice(0, LIST_PREVIEW_LENGTH)}…` : value;

  if (fieldType === 'url') {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-primary hover:underline">
        {preview}
      </a>
    );
  }

  return <span className="whitespace-pre-wrap text-sm text-ink">{preview}</span>;
}

export interface CmsFieldEditorProps {
  page: string;
  section: string;
  field: string;
  value: string;
  fieldType: CmsFieldType;
  canDelete: boolean;
  onSaved: (section: string, field: string, value: string) => void;
  onDeleteRequested: (section: string, field: string) => void;
  // Omit `reorder` entirely to hide the arrows (e.g. inside a special
  // editor like Logo/Nav that manages its own order). When present, both
  // callbacks must exist — use the disabled flags for boundary items
  // instead of omitting a single direction.
  reorder?: {
    onMoveUp: () => void;
    onMoveDown: () => void;
    moveUpDisabled?: boolean;
    moveDownDisabled?: boolean;
    busy?: boolean;
  };
}

export default function CmsFieldEditor({
  page,
  section,
  field,
  value,
  fieldType,
  canDelete,
  onSaved,
  onDeleteRequested,
  reorder,
}: CmsFieldEditorProps) {
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

  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {reorder && (
            <div className="flex shrink-0 flex-col gap-0.5">
              <IconButton title="Move up" disabled={reorder.busy || reorder.moveUpDisabled} onClick={reorder.onMoveUp}>
                <ArrowUpIcon />
              </IconButton>
              <IconButton title="Move down" disabled={reorder.busy || reorder.moveDownDisabled} onClick={reorder.onMoveDown}>
                <ArrowDownIcon />
              </IconButton>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-ink-faint">{field}</p>
            <span className="text-[10px] uppercase tracking-wide text-ink-faint/70">{fieldType}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {justSaved && <CheckIcon />}
          {!editing && (
            <>
              <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => setEditing(true)}>
                Edit
              </Button>
              {canDelete && (
                <IconButton title="Delete field" variant="danger" onClick={() => onDeleteRequested(section, field)}>
                  <TrashIcon />
                </IconButton>
              )}
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <FieldTypeInput fieldType={fieldType} draft={draft} setDraft={setDraft} />
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
        <div className="mt-1.5">
          <FieldValueDisplay fieldType={fieldType} value={value} />
        </div>
      )}
    </div>
  );
}
