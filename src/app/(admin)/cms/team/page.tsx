'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import { createCmsTeamMember, deleteCmsTeamMember, getCmsTeam, reorderCmsTeam, updateCmsTeamMember } from '@/lib/api';
import type { CmsTeamMember, CmsTeamPayload } from '@/lib/types';
import { Badge, Button, Card, EmptyState, ErrorNote, IconButton, Input, Label, LoadingBlock, Modal, PageHeader, Textarea, Toggle } from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';

const EMPTY_FORM: CmsTeamPayload = { name: '', role: '', bio: '', photo_url: '', linkedin_url: '', is_active: true };

export default function TeamPage() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const { data: team, loading, error, reload } = useFetch(() => adminFetch((t) => getCmsTeam(t)), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CmsTeamMember | null>(null);
  const [form, setForm] = useState<CmsTeamPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CmsTeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(member: CmsTeamMember) {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      bio: member.bio ?? '',
      photo_url: member.photo_url ?? '',
      linkedin_url: member.linkedin_url ?? '',
      is_active: member.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      setFormError('Name and role are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await adminFetch((t) => updateCmsTeamMember(t, editing.id, form));
        showToast('success', 'Team member updated');
      } else {
        await adminFetch((t) => createCmsTeamMember(t, form));
        showToast('success', 'Team member created');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save team member';
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
      await adminFetch((t) => deleteCmsTeamMember(t, deleteTarget.id));
      showToast('success', 'Team member deleted');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete team member');
    } finally {
      setDeleting(false);
    }
  }

  const move = useCallback(
    async (index: number, direction: -1 | 1) => {
      if (!team) return;
      const target = index + direction;
      if (target < 0 || target >= team.length) return;
      const reordered = [...team];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setReordering(true);
      try {
        await adminFetch((t) => reorderCmsTeam(t, reordered.map((m) => m.id)));
        showToast('success', 'Team reordered');
        reload();
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to reorder team');
      } finally {
        setReordering(false);
      }
    },
    [team, adminFetch, reload, showToast]
  );

  return (
    <div>
      <PageHeader title="Team" description="Team members shown on the site." action={<Button onClick={openCreate}>Add Member</Button>} />

      {loading && !team ? (
        <LoadingBlock />
      ) : error && !team ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !team || team.length === 0 ? (
        <EmptyState>No team members yet — add one to get started.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => (
            <Card key={m.id}>
              <div className="flex items-start gap-3">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt={m.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card-hover text-lg font-bold text-ink-faint">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{m.name}</p>
                  <p className="truncate text-sm text-primary">{m.role}</p>
                  <Badge tone={m.is_active ? 'green' : 'neutral'} className="mt-1">
                    {m.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              {m.bio && <p className="mt-3 line-clamp-3 text-xs text-ink-dim">{m.bio}</p>}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
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
                <div className="flex items-center gap-1.5">
                  <IconButton title="Edit" onClick={() => openEdit(m)}>
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
                  <IconButton title="Delete" variant="danger" onClick={() => setDeleteTarget(m)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {reordering && <p className="mt-2 text-xs text-ink-faint">Saving order…</p>}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <Label>Photo URL</Label>
            <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
          </div>
          <Toggle checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Member'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Remove "${deleteTarget?.name}" from the team? This can't be undone.`}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
