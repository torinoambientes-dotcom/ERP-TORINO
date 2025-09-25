'use client';

import { AppShell } from '@/components/layout/app-shell';
import { AppProvider } from './app-context';
import { usePathname } from 'next/navigation';

export function ClientAppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
