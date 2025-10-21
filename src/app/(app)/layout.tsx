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
      <AuthGuard>
        <AppProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AppProvider>
      </AuthGuard>
    );
  }

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
