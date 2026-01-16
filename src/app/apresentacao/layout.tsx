'use client';

import { AppProvider } from '@/context/app-context';

export default function FactoryDisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
