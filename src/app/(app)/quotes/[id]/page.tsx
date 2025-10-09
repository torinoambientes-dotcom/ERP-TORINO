'use client';
import { useContext, useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import type { Quote, StageStatus, TeamMember } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function QuoteDetailsPage() {
  const { quotes, teamMembers, isLoading } = useContext(AppContext);
  const params = useParams();
  const id = params.id as string;

  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoading && quotes) {
      const foundQuote = quotes.find((q) => q.id === id);
      setQuote(foundQuote ? JSON.parse(JSON.stringify(foundQuote)) : null);
    }
  }, [id, quotes, isLoading]);

  if (quote === undefined || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando orçamento...</p>
      </div>
    );
  }

  if (quote === null) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="-ml-4">
            <Link href="/quotes">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para orçamentos
            </Link>
          </Button>
          <PageHeader
            title={quote.clientName}
            description="Detalhes do orçamento e acompanhamento das etapas."
          />
        </div>
      </div>

      {/* Sections for each stage will be added here */}
      <div className="p-8 border rounded-lg bg-muted/30">
        <p className="text-center text-muted-foreground">
          Em breve: seções para gerenciar as etapas de Projeto, Levantamento de Materiais, Descritivo e Status.
        </p>
      </div>

    </div>
  );
}
