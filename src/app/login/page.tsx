'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/context/admin-auth-context';
import { Button, Card, ErrorNote, Input, Label } from '@/components/ui';

export default function LoginPage() {
  const { login, isLoggingIn, loginError, isAuthenticated } = useAdminAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await login({ username, password, totp_code: totpCode });
    if (ok) router.replace('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial-glow px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple text-lg font-bold text-[#03131a]">
            F
          </span>
          <h1 className="text-lg font-bold text-ink">
            FlowDex <span className="text-primary">Admin</span>
          </h1>
          <p className="mt-1 text-xs text-ink-dim">Sign in to manage the $FDP presale.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label>2FA Code</Label>
            <Input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              autoComplete="one-time-code"
              className="font-mono tracking-[0.3em]"
              required
            />
          </div>

          {loginError && <ErrorNote>{loginError}</ErrorNote>}

          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
