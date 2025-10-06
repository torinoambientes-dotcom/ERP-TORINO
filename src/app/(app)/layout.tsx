'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from '@/context/app-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppProvider>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </AppProvider>
    </AuthGuard>
  );
}
