'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { getWhitepaperStatus, resolveAssetUrl, uploadWhitepaper } from '@/lib/api';
import { Button, Card, LoadingBlock, PageHeader, Spinner } from '@/components/ui';

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 2 : 1)}MB`;
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-ink-faint" aria-hidden="true">
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

export default function WhitepaperPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<{ exists: boolean; url: string; sizeBytes: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getWhitepaperStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleFile(file: File) {
    setError(null);
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File exceeds the 20MB limit.');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await adminFetch((token) => uploadWhitepaper(token, file, setProgress));
      showToast('success', 'Whitepaper updated successfully');
      await loadStatus();
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

  const fullUrl = status ? resolveAssetUrl(status.url) : '';

  return (
    <div>
      <PageHeader title="Whitepaper" description="Manage the PDF served at /whitepaper across the site." />

      <Card className="max-w-2xl">
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-soft p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {status?.exists ? `Current: whitepaper.pdf${status.sizeBytes !== null ? ` (${formatBytes(status.sizeBytes)})` : ''}` : 'No whitepaper uploaded'}
                </p>
                {status?.exists && <p className="mt-0.5 truncate font-mono text-xs text-ink-faint">{fullUrl}</p>}
              </div>
              {status?.exists && (
                <div className="flex shrink-0 gap-1.5">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-card-hover px-3 text-xs font-semibold text-ink transition-colors hover:border-primary/50"
                  >
                    Preview
                  </a>
                  <a
                    href={fullUrl}
                    download="whitepaper.pdf"
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-card-hover px-3 text-xs font-semibold text-ink transition-colors hover:border-primary/50"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPick} />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary-dim' : 'border-border'
              }`}
            >
              {uploading ? (
                <>
                  <Spinner className="h-6 w-6 text-primary" />
                  <p className="text-sm text-ink-dim">Uploading… {progress}%</p>
                </>
              ) : (
                <>
                  <UploadIcon />
                  <p className="text-sm text-ink-dim">Drag &amp; drop a PDF, or</p>
                  <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    Upload PDF
                  </Button>
                  <p className="text-xs text-ink-faint">PDF only — up to 20MB</p>
                </>
              )}
            </div>

            {error && <p className="mt-2 text-xs text-red">{error}</p>}
          </>
        )}
      </Card>
    </div>
  );
}
