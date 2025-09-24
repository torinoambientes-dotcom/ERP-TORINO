'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="h-full border-r bg-card">
          <SidebarNav />
        </Sidebar>
        <main className="flex-1">
          <SidebarInset className="max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </SidebarInset>
        </main>
      </div>
    </SidebarProvider>
  );
}
