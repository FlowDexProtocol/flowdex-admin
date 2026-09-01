'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { deleteCmsBlogPost, getCmsBlogAdmin, publishCmsBlogPost, unpublishCmsBlogPost } from '@/lib/api';
import type { CmsBlogPost } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Badge, Button, EmptyState, ErrorNote, IconButton, LoadingBlock, PageHeader, TableShell, td, th } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function BlogListPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const { data: posts, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsBlogAdmin(t)), []);

  const [deleteTarget, setDeleteTarget] = useState<CmsBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch((t) => deleteCmsBlogPost(t, deleteTarget.id));
      showToast('success', 'Post deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublish(post: CmsBlogPost) {
    setTogglingId(post.id);
    try {
      if (post.is_published) {
        await adminFetch((t) => unpublishCmsBlogPost(t, post.id));
        showToast('success', 'Post unpublished');
      } else {
        await adminFetch((t) => publishCmsBlogPost(t, post.id));
        showToast('success', 'Post published');
      }
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Blog posts published on the site."
        action={
          <Link href="/cms/blog/new">
            <Button>New Post</Button>
          </Link>
        }
      />

      {loading && !posts ? (
        <LoadingBlock />
      ) : error && !posts ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !posts || posts.length === 0 ? (
        <EmptyState>No posts yet — write one to get started.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>ID</th>
              <th className={th}>Title</th>
              <th className={th}>Slug</th>
              <th className={th}>Category</th>
              <th className={th}>Author</th>
              <th className={th}>Status</th>
              <th className={th}>Published</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((p) => (
              <tr key={p.id}>
                <td className={`${td} text-ink-faint`}>{p.id}</td>
                <td className={`${td} font-medium text-ink`}>{p.title}</td>
                <td className={`${td} font-mono text-xs text-ink-dim`}>{p.slug}</td>
                <td className={`${td} text-ink-dim`}>{p.category}</td>
                <td className={`${td} text-ink-dim`}>{p.author}</td>
                <td className={td}>
                  <Badge tone={p.is_published ? 'green' : 'neutral'}>{p.is_published ? 'Published' : 'Draft'}</Badge>
                </td>
                <td className={`${td} text-ink-dim`}>{formatDate(p.published_at)}</td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={togglingId === p.id} onClick={() => togglePublish(p)}>
                      {togglingId === p.id ? '…' : p.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Link
                      href={`/cms/blog/${p.id}`}
                      title="Edit"
                      aria-label="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-dim transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                    <IconButton title="Delete" variant="danger" onClick={() => setDeleteTarget(p)}>
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

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Delete post "${deleteTarget?.title}"? This can't be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
