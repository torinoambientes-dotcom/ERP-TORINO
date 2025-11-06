'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from '@/context/app-context';
import { AuthGuard } from '@/components/auth/auth-guard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Conditionally apply AppShell based on the route
  if (pathname === '/factory-display/play') {
    return (
      <AppProvider>
        <AuthGuard>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthGuard>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <AuthGuard>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </AuthGuard>
    </AppProvider>
  );
}
