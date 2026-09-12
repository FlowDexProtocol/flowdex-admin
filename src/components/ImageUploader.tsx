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
import { Button, EmptyState, ErrorNote, Input, Label, LoadingBlock, Modal, Spinner } from './ui';
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

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,application/json`;
// Logo's "Animated" mode specifically — gif/mp4/json only, not the static
// image formats "media" also allows (an animated logo that's actually a
// static PNG defeats the point of the mode).
const ANIMATED_ACCEPT = 'image/gif,video/mp4,application/json';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

// Value is a URL (uploaded or pasted) — the extension is the only signal we
// have for how to preview it, same way the landing site itself decides
// image vs gif vs video vs Lottie at render time.
export type MediaKind = 'image' | 'video' | 'lottie' | 'unknown';
export function detectMediaKind(url: string): MediaKind {
  const path = url.split('?')[0].split('#')[0];
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (ext === 'mp4') return 'video';
  if (ext === 'json') return 'lottie';
  return 'unknown';
}
export function fileNameFromUrl(url: string): string {
  const path = url.split('?')[0].split('#')[0];
  return path.slice(path.lastIndexOf('/') + 1) || url;
}

export function MediaPreview({ value, className }: { value: string; className?: string }) {
  const sizeClass = className ?? 'h-20 w-20 shrink-0 rounded-lg border border-border object-cover';
  const kind = detectMediaKind(value);
  if (kind === 'video') {
    return <video src={value} className={sizeClass} autoPlay loop muted playsInline />;
  }
  if (kind === 'lottie') {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-bg-soft p-1 text-center ${sizeClass}`}>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">Lottie</span>
        <span className="truncate px-1 text-[9px] text-ink-faint" title={fileNameFromUrl(value)}>
          {fileNameFromUrl(value)}
        </span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={value} alt="" className={sizeClass} />;
}

export default function ImageUploader({
  label,
  value,
  onChange,
  required,
  kind = 'image',
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  required?: boolean;
  // 'image' = static images only (jpg/png/gif/webp/svg); 'media' additionally
  // allows mp4 (video) and json (Lottie) — used for the CMS's 'media' field
  // type (animated logos, ecosystem-card animations). 'animated' is
  // narrower still — gif/mp4/json only, for the Logo editor's Animated mode.
  kind?: 'image' | 'media' | 'animated';
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const accept = kind === 'media' ? MEDIA_ACCEPT : kind === 'animated' ? ANIMATED_ACCEPT : IMAGE_ACCEPT;
  const hint =
    kind === 'media'
      ? 'JPG, PNG, GIF, WEBP, SVG, MP4, or Lottie JSON — up to 15MB'
      : kind === 'animated'
        ? 'GIF, MP4, or Lottie JSON — up to 15MB'
        : 'JPG, PNG, GIF, WEBP, or SVG — up to 15MB';

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

  function submitUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange(url);
    setUrlDraft('');
    setUrlMode(false);
  }

  return (
    <div>
      {label && <Label required={required}>{label}</Label>}
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={onPick} />

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border p-3">
          <MediaPreview value={value} />
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
        <>
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
                <p className="text-sm text-ink-dim">Drag &amp; drop {kind === 'image' ? 'an image' : 'a file'}, or</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                    Click to Upload
                  </Button>
                  <Button type="button" variant="secondary" className="!min-h-0 !px-3 !py-1.5 text-xs" onClick={() => setBrowseOpen(true)}>
                    Browse Existing
                  </Button>
                </div>
                <p className="text-xs text-ink-faint">{hint}</p>
              </>
            )}
          </div>

          {!uploading &&
            (urlMode ? (
              <div className="mt-2 flex gap-1.5">
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://… or /uploads/…"
                  className="font-mono text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitUrl();
                    }
                  }}
                />
                <Button type="button" className="!min-h-0 shrink-0 !px-3 !py-1.5 text-xs" onClick={submitUrl}>
                  Use
                </Button>
                <Button type="button" variant="ghost" className="!min-h-0 shrink-0 !px-2 !py-1.5 text-xs" onClick={() => setUrlMode(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button type="button" onClick={() => setUrlMode(true)} className="mt-2 text-xs text-primary hover:underline">
                Or paste URL
              </button>
            ))}
        </>
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
