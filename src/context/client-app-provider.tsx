'use client';

import { type ReactNode } from 'react';
import { AppProvider } from './app-context';

export function ClientAppProvider({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
