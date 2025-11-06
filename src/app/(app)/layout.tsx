'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AuthGuard } from '@/components/auth/auth-guard';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
    </AuthGuard>
  );
}
