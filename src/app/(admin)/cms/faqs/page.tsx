'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { createCmsFaq, deleteCmsFaq, getCmsFaqsAdmin, reorderCmsFaqs, updateCmsFaq } from '@/lib/api';
import type { CmsFaq, CmsFaqPayload } from '@/lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  IconButton,
  Label,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  TableShell,
  Textarea,
  Toggle,
  td,
  th,
} from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

const CATEGORIES = ['general', 'presale', 'tokenomics', 'referral', 'security'];

const EMPTY_FORM: CmsFaqPayload = { question: '', answer: '', category: 'general', is_active: true };

function truncate(text: string, max = 70) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function FaqsPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const { data: faqs, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsFaqsAdmin(t)), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CmsFaq | null>(null);
  const [form, setForm] = useState<CmsFaqPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsFaq | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(faq: CmsFaq) {
    setEditing(faq);
    setForm({ question: faq.question, answer: faq.answer, category: faq.category, is_active: faq.is_active });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      setFormError('Question and answer are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await adminFetch((t) => updateCmsFaq(t, editing.id, form));
        showToast('success', 'FAQ updated');
      } else {
        await adminFetch((t) => createCmsFaq(t, form));
        showToast('success', 'FAQ created');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save FAQ';
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
      await adminFetch((t) => deleteCmsFaq(t, deleteTarget.id));
      showToast('success', 'FAQ deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete FAQ');
    } finally {
      setDeleting(false);
    }
  }

  const move = useCallback(
    async (index: number, direction: -1 | 1) => {
      if (!faqs) return;
      const target = index + direction;
      if (target < 0 || target >= faqs.length) return;
      const reordered = [...faqs];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setReordering(true);
      try {
        await adminFetch((t) => reorderCmsFaqs(t, reordered.map((f) => f.id)));
        showToast('success', 'FAQs reordered');
        reload();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to reorder FAQs');
      } finally {
        setReordering(false);
      }
    },
    [faqs, adminFetch, reload, showToast]
  );

  return (
    <div>
      <PageHeader title="FAQs" description="Frequently asked questions shown across the site." action={<Button onClick={openCreate}>Add FAQ</Button>} />

      {loading && !faqs ? (
        <LoadingBlock />
      ) : error && !faqs ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !faqs || faqs.length === 0 ? (
        <EmptyState>No FAQs yet — create one to get started.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>ID</th>
              <th className={th}>Question</th>
              <th className={th}>Category</th>
              <th className={th}>Sort</th>
              <th className={th}>Active</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {faqs.map((f, i) => (
              <tr key={f.id}>
                <td className={`${td} text-ink-faint`}>{f.id}</td>
                <td className={`${td} font-medium text-ink`}>{truncate(f.question)}</td>
                <td className={td}>
                  <Badge tone="neutral">{f.category}</Badge>
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
                  <Badge tone={f.is_active ? 'green' : 'neutral'}>{f.is_active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <IconButton title="Edit" onClick={() => openEdit(f)}>
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
                    <IconButton title="Delete" variant="danger" onClick={() => setDeleteTarget(f)}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit FAQ' : 'Add FAQ'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Question</Label>
            <Textarea rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
          </div>
          <div>
            <Label>Answer</Label>
            <Textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
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
          <Toggle checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create FAQ'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message="Delete this FAQ? This can't be undone."
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
