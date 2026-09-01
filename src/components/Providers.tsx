'use client';

import type { ReactNode } from 'react';
import { AdminAuthProvider } from '@/context/admin-auth-context';
import { ToastProvider } from '@/context/toast-context';
import ToastContainer from './ToastContainer';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </AdminAuthProvider>
  );
}
