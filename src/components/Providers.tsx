'use client';

import type { ReactNode } from 'react';
import { AdminAuthProvider } from '@/context/admin-auth-context';

export default function Providers({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
