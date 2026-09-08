'use client';

import { AppProvider } from '@/context/app-context';

export default function AlmoxarifadoDisplayLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}
