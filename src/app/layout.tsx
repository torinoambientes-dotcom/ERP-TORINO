import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { AppProvider } from '@/context/app-context';
import { ClientOnly } from '@/components/client-only';

export const metadata: Metadata = {
  title: 'Torino ERP',
  description: 'Torino ERP - Gerenciamento de projetos para marcenarias de alto padrão',
  icons: {
    icon: '/icon.svg?v=4',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <ClientOnly>
            <AppProvider>
                {children}
            </AppProvider>
          </ClientOnly>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
