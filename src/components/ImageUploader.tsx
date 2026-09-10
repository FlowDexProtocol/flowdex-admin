'use client';

// ══════════════════════════════════════════════════
// src/components/ImageUploader.tsx
// Replaces every plain "image URL" text input across the CMS (banners,
// blog cover, team photos) with upload-or-browse-existing. Used standalone
// wherever an image field is needed — there's no dedicated Media page
// anymore (see Sidebar.tsx / removed cms/media route); cms_media now exists
// purely as the backing store for "Browse Existing" here.
// ══════════════════════════════════════════════════

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { createCmsMedia, deleteCmsMedia, getCmsMedia, resolveAssetUrl, uploadFile } from '@/lib/api';
import type { CmsMedia } from '@/lib/types';
import { Button, EmptyState, ErrorNote, Label, LoadingBlock, Modal, Spinner } from './ui';
import ConfirmDialog from './ConfirmDialog';

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-faint" aria-hidden="true">
      <path
        d="M7 16a4 4 0 0 1-.88-7.9A5.5 5.5 0 0 1 17.5 9a4 4 0 0 1-.5 8H7Zm5-6v7m0-7-2.5 2.5M12 10l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BrowseExistingModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [media, setMedia] = useState<CmsMedia[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsMedia | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminFetch((t) => getCmsMedia(t))
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load images');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, adminFetch]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch((t) => deleteCmsMedia(t, deleteTarget.id));
      setMedia((prev) => (prev ? prev.filter((m) => m.id !== deleteTarget.id) : prev));
      showToast('success', 'Image removed');
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Browse Existing Images" size="lg">
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !media || media.length === 0 ? (
        <EmptyState>No uploaded images yet — upload one first and it&rsquo;ll show up here.</EmptyState>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((m) => (
            <div
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border transition-colors hover:border-primary/60"
            >
              <button type="button" onClick={() => onSelect(m.url)} title={m.name} className="h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(m);
                }}
                title="Remove from library"
                aria-label="Remove from library"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white opacity-0 transition-opacity hover:bg-red hover:opacity-100 group-hover:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Remove "${deleteTarget?.name}" from the media library? This can't be undone (it won't delete anywhere it's already in use).`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Modal>
  );
}

export default function ImageUploader({
  label,
  value,
  onChange,
  required,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  required?: boolean;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const res = await adminFetch((token) => uploadFile(token, file, setProgress));
      const url = resolveAssetUrl(res.url);
      onChange(url);
      // Best-effort registration so this shows up under "Browse Existing"
      // later — the image is already uploaded and usable either way.
      adminFetch((token) => createCmsMedia(token, { name: file.name, type: 'image', url, category: 'uploads' })).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      showToast('error', message);
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate font-mono text-xs text-ink-faint">{value}</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="secondary"
                className="!min-h-0 !px-3 !py-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!min-h-0 !px-3 !py-1.5 text-xs"
                onClick={() => setBrowseOpen(true)}
                disabled={uploading}
              >
                Browse Existing
              </Button>
              <Button type="button" variant="ghost" className="!min-h-0 !px-3 !py-1.5 text-xs text-red" onClick={() => onChange('')} disabled={uploading}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary-dim' : 'border-border'
          }`}
        >
          {uploading ? (
            <>
              <Spinner className="h-5 w-5 text-primary" />
              <p className="text-xs text-ink-dim">Uploading… {progress}%</p>
            </>
          ) : (
            <>
              <UploadIcon />
              <p className="text-sm text-ink-dim">Drag &amp; drop an image, or</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                  Click to Upload
                </Button>
                <Button type="button" variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => setBrowseOpen(true)}>
                  Browse Existing
                </Button>
              </div>
              <p className="text-xs text-ink-faint">JPG, PNG, GIF, WEBP, or SVG — up to 5MB</p>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}

      <BrowseExistingModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setBrowseOpen(false);
        }}
      />
    </div>
  );
}
