'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ArrowRight } from 'lucide-react';

export default function EntrarPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Se o usuário já está logado e o carregamento terminou, redireciona para a home
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  // Enquanto verifica o status do usuário, mostra uma tela de carregamento
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <Logo className="h-20 w-auto" />
        <p className="mt-4 text-muted-foreground">Verificando acesso...</p>
      </div>
    );
  }

  // Se o usuário não estiver logado, mostra a página para entrar
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-card/50 p-8 shadow-lg backdrop-blur-sm md:p-12">
        <Logo className="h-24 w-auto" />
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-foreground">
            Bem-vindo ao ProjectFlow
          </h1>
          <p className="text-muted-foreground">
            O seu sistema de gestão para marcenarias de alto padrão.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full max-w-xs"
          onClick={() => router.push('/login')}
        >
          Entrar no Sistema
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
      <footer className="absolute bottom-4 text-xs text-muted-foreground/50">
        <p>Torino Ambientes © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
