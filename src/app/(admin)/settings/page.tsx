'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { adminChangePassword, adminGenerateBackupCodes, getCmsPageContent, setCmsPageField, ApiError } from '@/lib/api';
import { Button, Card, ErrorNote, Input, Label, PageHeader, SuccessNote, Toggle } from '@/components/ui';

const ROLE_LABEL: Record<string, string> = { super_admin: 'Super Admin', editor: 'Editor', viewer: 'Viewer' };

function AccountInfoCard() {
  const { username, role } = useAdminAuth();
  return (
    <Card>
      <p className="text-sm font-semibold text-ink">Account</p>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-dim">Username</span>
          <span className="font-medium text-ink">{username}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-dim">Role</span>
          <span className="font-medium text-ink">{role ? ROLE_LABEL[role] : '—'}</span>
        </div>
      </div>
      {role === 'super_admin' && (
        <Link href="/users" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          Manage Admin Users →
        </Link>
      )}
    </Card>
  );
}

// Both the password-change and backup-codes routes are now super_admin-only
// at the backend (a route-level gate on the existing single shared
// endpoints — there's no separate "change my own password regardless of
// role" endpoint in this batch's backend work). The task's own Settings-
// page spec describes "Change My Password" as if every role has it, which
// doesn't actually agree with that backend decision. Rather than silently
// hiding the card for non-super-admins (which would contradict the task's
// literal ask) or pretending it always works, it stays visible for every
// role and surfaces the backend's real 403 as an inline error — with a
// heads-up note for non-super-admins set before they even try.
function ChangePasswordCard() {
  const { adminFetch, role } = useAdminAuth();
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
      {role && role !== 'super_admin' && (
        <p className="mt-1.5 text-xs text-amber">Currently restricted to super admins on the backend — this will likely fail.</p>
      )}
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
  const { adminFetch, role } = useAdminAuth();
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
      {role && role !== 'super_admin' && (
        <p className="mt-1.5 text-xs text-amber">Currently restricted to super admins on the backend — this will likely fail.</p>
      )}

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

// Only From Email / Daily Digest / Threshold are genuinely persisted here,
// via the existing CMS page-content mechanism (page='global', section=
// 'email'). The SendGrid API key is a real secret — there is no backend
// endpoint in this batch that stores arbitrary secrets, and writing one to
// a CMS text field the editor UI displays in plaintext would be a real
// security regression, not a shortcut. It's shown read-only with an
// explanation instead of a fake Save button. "Send Test Email" has no
// corresponding backend endpoint in this batch either (no POST
// /admin/email/test) — shown disabled with a note rather than wired to
// something that doesn't exist.
function EmailSettingsCard() {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fromEmail, setFromEmail] = useState('noreply@flowdexprotocol.com');
  const [dailyDigest, setDailyDigest] = useState(true);
  const [threshold, setThreshold] = useState('10000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminFetch((token) => getCmsPageContent(token, 'global'))
      .then((content) => {
        if (cancelled) return;
        if (content['email.from_email']) setFromEmail(content['email.from_email']);
        if (content['email.daily_digest_enabled']) setDailyDigest(content['email.daily_digest_enabled'] === 'true');
        if (content['email.large_purchase_threshold']) setThreshold(content['email.large_purchase_threshold']);
      })
      .catch(() => {
        // No saved settings yet — defaults above stand.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminFetch]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adminFetch((token) => setCmsPageField(token, 'global', 'email', 'from_email', fromEmail));
      await adminFetch((token) => setCmsPageField(token, 'global', 'email', 'daily_digest_enabled', String(dailyDigest)));
      await adminFetch((token) => setCmsPageField(token, 'global', 'email', 'large_purchase_threshold', threshold));
      showToast('success', 'Email settings saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save email settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <p className="text-sm font-semibold text-ink">Email</p>
      <div className="mt-4 space-y-4">
        <div>
          <Label>SendGrid API Key</Label>
          <Input value="Set via SENDGRID_API_KEY" disabled className="opacity-60" />
          <p className="mt-1.5 text-xs text-ink-faint">
            Set via the <code>SENDGRID_API_KEY</code> environment variable on the server — cannot be changed from this
            dashboard for security.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>From Email</Label>
            <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} disabled={loading} />
          </div>
          <div>
            <Label>Large Purchase Alert Threshold ($)</Label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value.replace(/[^0-9]/g, ''))}
              disabled={loading}
            />
          </div>
        </div>
        <Toggle checked={dailyDigest} onChange={setDailyDigest} label="Daily Digest" />

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Email Settings'}
          </Button>
          <Button variant="secondary" disabled title="No test-email endpoint exists on the backend yet">
            Send Test Email
          </Button>
        </div>
        <p className="text-xs text-ink-faint">
          &ldquo;Send Test Email&rdquo; needs a backend endpoint (e.g. <code>POST /admin/email/test</code>) that
          doesn&rsquo;t exist yet — disabled until one is added.
        </p>
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const { role } = useAdminAuth();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your admin account security." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccountInfoCard />
        <div className="hidden lg:block" />
        <ChangePasswordCard />
        <BackupCodesCard />
        {role === 'super_admin' && <EmailSettingsCard />}
      </div>
    </div>
  );
}
