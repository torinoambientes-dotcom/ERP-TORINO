'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppProvider } from '@/context/app-context';
import { FirebaseProvider } from '@/firebase/provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      <AuthGuard>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </AuthGuard>
    </FirebaseProvider>
  );
}
