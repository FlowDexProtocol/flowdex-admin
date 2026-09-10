'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { createCmsBlogPost, deleteCmsBlogPost, getCmsBlogAdmin, publishCmsBlogPost, unpublishCmsBlogPost } from '@/lib/api';
import type { CmsBlogPost } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { Badge, Button, EmptyState, ErrorNote, IconButton, PageHeader, TableShell, TableSkeleton, td, tdActions, th, thActions } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

// Quill writes literal "&nbsp;" for some spaces (trailing/repeated ones) —
// left undecoded, "word&nbsp;word" has no real whitespace to split on and
// the whole sentence counts as a single "word".
function wordCount(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

export default function BlogListPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { data: posts, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsBlogAdmin(t)), []);

  const [deleteTarget, setDeleteTarget] = useState<CmsBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

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

  // Backend always derives a fresh, deduped slug from the title on create
  // (ignores any slug in the payload) — no need to hand-roll "-copy-2" etc.
  async function handleDuplicate(post: CmsBlogPost) {
    setDuplicatingId(post.id);
    try {
      await adminFetch((t) =>
        createCmsBlogPost(t, {
          title: `Copy of ${post.title}`,
          category: post.category,
          author: post.author,
          cover_image_url: post.cover_image_url || undefined,
          excerpt: post.excerpt || undefined,
          content: post.content,
          is_published: false,
        })
      );
      showToast('success', 'Post duplicated as a draft');
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to duplicate post');
    } finally {
      setDuplicatingId(null);
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
        <TableSkeleton cols={8} />
      ) : error && !posts ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !posts || posts.length === 0 ? (
        <EmptyState>
          <p>No blog posts — write your first one to get started.</p>
          <Link href="/cms/blog/new">
            <Button className="mt-4">New Post</Button>
          </Link>
        </EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}></th>
              <th className={th}>Title</th>
              <th className={th}>Category</th>
              <th className={th}>Author</th>
              <th className={th}>Length</th>
              <th className={th}>Status</th>
              <th className={th}>Published</th>
              <th className={thActions}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((p) => {
              const words = wordCount(p.content);
              return (
                <tr key={p.id} onClick={() => router.push(`/cms/blog/${p.id}`)} className="cursor-pointer">
                  <td className={td}>
                    {p.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_image_url} alt="" className="h-10 w-[60px] rounded object-cover" />
                    ) : (
                      <div className="flex h-10 w-[60px] items-center justify-center rounded bg-card-hover text-ink-faint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                          <path d="m21 15-5-5-11 11" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <p className="max-w-[280px] truncate font-medium text-ink">{p.title}</p>
                    <p className="max-w-[280px] truncate font-mono text-xs text-ink-faint">{p.slug}</p>
                  </td>
                  <td className={`${td} max-w-[140px] truncate text-ink-dim`}>{p.category}</td>
                  <td className={`${td} max-w-[140px] truncate text-ink-dim`}>{p.author}</td>
                  <td className={`${td} text-ink-dim`}>{words.toLocaleString()} words</td>
                  <td className={td}>
                    <Badge tone={p.is_published ? 'green' : 'neutral'}>{p.is_published ? 'Published' : 'Draft'}</Badge>
                  </td>
                  <td className={`${td} text-ink-dim`}>{p.is_published && p.published_at ? `Published on ${formatDate(p.published_at)}` : '—'}</td>
                  <td className={tdActions} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <Button variant="secondary" className="!px-3 !py-1.5 text-xs" disabled={togglingId === p.id} onClick={() => togglePublish(p)}>
                        {togglingId === p.id ? '…' : p.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <IconButton title="Duplicate" onClick={() => handleDuplicate(p)}>
                        {duplicatingId === p.id ? (
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.75" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                          </svg>
                        )}
                      </IconButton>
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
              );
            })}
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
