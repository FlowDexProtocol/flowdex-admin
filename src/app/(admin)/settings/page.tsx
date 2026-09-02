'use client';

import { useState, type FormEvent } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { adminChangePassword, adminGenerateBackupCodes, ApiError } from '@/lib/api';
import { Button, Card, ErrorNote, Input, Label, PageHeader, SuccessNote } from '@/components/ui';

function ChangePasswordCard() {
  const { adminFetch } = useAdminAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminFetch((token) =>
        adminChangePassword(token, { current_password: currentPassword, new_password: newPassword })
      );
      setSuccess(res.message || 'Password changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-ink">Change Password</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label>Current Password</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <Label>New Password</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}
        {success && <SuccessNote>{success}</SuccessNote>}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Changing…' : 'Change Password'}
        </Button>
      </form>
    </Card>
  );
}

function BackupCodesCard() {
  const { adminFetch } = useAdminAuth();
  const [generating, setGenerating] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await adminFetch((token) => adminGenerateBackupCodes(token));
      setCodes(res.codes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate backup codes.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <p className="text-sm font-semibold text-ink">2FA Backup Codes</p>
      <p className="mt-1.5 text-xs text-ink-dim">
        Generate one-time backup codes to use in place of your 2FA code if you lose access to your authenticator.
        Generating a new batch invalidates any previous codes.
      </p>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {codes ? (
        <div className="mt-4">
          <ErrorNote>Save these codes. They won&rsquo;t be shown again.</ErrorNote>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-bg-soft p-4 sm:grid-cols-3">
            {codes.map((code) => (
              <span key={code} className="font-mono text-sm text-ink">
                {code}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate Backup Codes'}
        </Button>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your admin account security." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChangePasswordCard />
        <BackupCodesCard />
      </div>
    </div>
  );
}
