
'use client';

import { AppProvider } from '@/context/app-context';

export default function CuttingDisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
