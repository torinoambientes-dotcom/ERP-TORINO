'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from '@/context/app-context';
import { AuthGuard } from '@/components/auth/auth-guard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppProvider>
        <AppShell>{children}</AppShell>
      </AppProvider>
    </AuthGuard>
  );
}
