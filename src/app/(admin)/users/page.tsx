'use client';

import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { useFetch } from '@/lib/hooks';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  resetAdminUser2FA,
  resetAdminUserPassword,
  updateAdminUser,
} from '@/lib/api';
import type { AdminRole, AdminUser } from '@/lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Input,
  Label,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  TableShell,
  td,
  th,
} from '@/components/ui';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/format';

const ROLE_TONE: Record<AdminRole, 'purple' | 'primary' | 'neutral'> = {
  super_admin: 'purple',
  // No dedicated "blue" Badge tone exists in this palette — primary
  // (#627EEA) already IS a blue, so editor reuses it rather than adding a
  // new tone for a color the palette doesn't otherwise have.
  editor: 'primary',
  viewer: 'neutral',
};

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const EMPTY_FORM = { username: '', password: '', role: 'viewer' as AdminRole, display_name: '', email: '' };

function OneTimeSecretNote({ secret }: { secret: string }) {
  return (
    <div className="mt-4 rounded-lg border border-amber/30 bg-amber-dim p-4">
      <p className="text-sm font-semibold text-amber">Save this now — it will not be shown again.</p>
      <p className="mt-1 text-xs text-ink-dim">
        Give this secret to the user to set up their authenticator app (Google Authenticator, Authy, etc.).
      </p>
      <p className="mt-3 break-all rounded-lg border border-border bg-bg-soft p-3 font-mono text-sm text-ink">{secret}</p>
    </div>
  );
}

function AddUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);

  function handleClose() {
    setForm(EMPTY_FORM);
    setError(null);
    setTotpSecret(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch((token) => createAdminUser(token, form));
      if (!res.success) throw new Error(res.error || 'Failed to create user');
      showToast('success', `User "${form.username}" created`);
      onCreated();
      if (res.totp_secret) {
        setTotpSecret(res.totp_secret);
      } else {
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={totpSecret ? 'User Created' : 'Add User'}>
      {totpSecret ? (
        <div>
          <p className="text-sm text-ink-dim">
            <span className="font-semibold text-ink">{form.username}</span> was created as {ROLE_LABEL[form.role]}.
          </p>
          <OneTimeSecretNote secret={totpSecret} />
          <div className="mt-5 flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoFocus />
          </div>
          <div>
            <Label>Display Name</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
              <option value="super_admin">Super Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { adminFetch, userId: ownId } = useAdminAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState<AdminRole>(user?.role ?? 'viewer');
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSelf = user?.id === ownId;

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch((token) =>
        updateAdminUser(token, user!.id, { display_name: displayName, email, ...(isSelf ? {} : { role }) })
      );
      if (!res.success) throw new Error(res.error || 'Failed to update user');
      showToast('success', 'User updated');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${user.username}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Display Name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} disabled={isSelf}>
            <option value="super_admin">Super Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </Select>
          {isSelf && <p className="mt-1.5 text-xs text-ink-faint">You cannot change your own role.</p>}
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch((token) => resetAdminUserPassword(token, user!.id, password));
      if (!res.success) throw new Error(res.error || 'Failed to reset password');
      showToast('success', `Password reset for ${user!.username}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Reset Password — ${user.username}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>New Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
          />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Resetting…' : 'Reset Password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Reset2FAModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { adminFetch } = useAdminAuth();
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch((token) => resetAdminUser2FA(token, user!.id));
      if (!res.success || !res.totp_secret) throw new Error(res.error || 'Failed to reset 2FA');
      setSecret(res.totp_secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset 2FA');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Reset 2FA — ${user.username}`}>
      {secret ? (
        <div>
          <OneTimeSecretNote secret={secret} />
          <div className="mt-5 flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-ink-dim">
            This generates a new 2FA secret for {user.username} and invalidates their current authenticator setup.
          </p>
          {error && (
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={busy}>
              {busy ? 'Generating…' : 'Generate New Secret'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function UsersPage() {
  const { adminFetch, userId: ownId } = useAdminAuth();
  const { showToast } = useToast();
  const { data: users, loading, error, reload } = useFetch(() => adminFetch((t) => getAdminUsers(t)), []);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState<AdminUser | null>(null);
  const [resetting2FA, setResetting2FA] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function handleToggleActive(user: AdminUser) {
    setTogglingId(user.id);
    try {
      const res = await adminFetch((token) => updateAdminUser(token, user.id, { is_active: !user.is_active }));
      if (!res.success) throw new Error(res.error || 'Failed to update user');
      showToast('success', `${user.username} ${user.is_active ? 'disabled' : 'enabled'}`);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch((token) => deleteAdminUser(token, deleteTarget.id));
      if (!res.success) throw new Error(res.error || 'Failed to disable user');
      showToast('success', `${deleteTarget.username} disabled`);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to disable user');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admin accounts and roles."
        action={<Button onClick={() => setAddOpen(true)}>Add User</Button>}
      />

      {loading && !users ? (
        <LoadingBlock />
      ) : error && !users ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !users || users.length === 0 ? (
        <EmptyState>No admin users yet.</EmptyState>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-border">
              <th className={th}>Username</th>
              <th className={th}>Display Name</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={th}>Last Login</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = u.id === ownId;
              return (
                <tr key={u.id}>
                  <td className={`${td} font-medium text-ink`}>{u.username}</td>
                  <td className={`${td} text-ink-dim`}>{u.display_name || '—'}</td>
                  <td className={td}>
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className={td}>
                    <Badge tone={u.is_active ? 'green' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className={`${td} text-ink-faint`}>{u.last_login ? formatDate(u.last_login) : 'Never'}</td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs"
                        disabled={isSelf}
                        title={isSelf ? 'Cannot modify own account' : undefined}
                        onClick={() => setEditing(u)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs"
                        disabled={isSelf || togglingId === u.id}
                        title={isSelf ? 'Cannot modify own account' : undefined}
                        onClick={() => handleToggleActive(u)}
                      >
                        {togglingId === u.id ? '…' : u.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => setResettingPassword(u)}>
                        Reset Password
                      </Button>
                      <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => setResetting2FA(u)}>
                        Reset 2FA
                      </Button>
                      <Button
                        variant="danger"
                        className="!px-2.5 !py-1.5 text-xs"
                        disabled={isSelf}
                        title={isSelf ? 'Cannot modify own account' : undefined}
                        onClick={() => setDeleteTarget(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={reload} />
      <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ResetPasswordModal user={resettingPassword} onClose={() => setResettingPassword(null)} />
      <Reset2FAModal user={resetting2FA} onClose={() => setResetting2FA(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Disable User"
        message={`Are you sure? This will permanently disable "${deleteTarget?.username}"'s access.`}
        confirmLabel="Disable"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
