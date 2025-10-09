'use client';

import { useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileText } from 'lucide-react';
import { AppContext } from '@/context/app-context';
import { RegisterQuoteModal } from '@/components/modals/register-quote-modal';
import type { Quote } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type QuoteGroup = 'inProgress' | 'approved' | 'rejected';

const statusGroupMap: Record<string, QuoteGroup> = {
  analyzing: 'inProgress',
  pending_send: 'inProgress',
  sent: 'inProgress',
  approved: 'approved',
  rejected: 'rejected',
};

const groupTitles: Record<QuoteGroup, string> = {
  inProgress: 'Em Andamento',
  approved: 'Fechados',
  rejected: 'Recusados',
};

const statusDisplayMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    analyzing: { label: 'Em Análise', variant: 'outline' },
    approved: { label: 'Aprovado', variant: 'default' },
    rejected: { label: 'Recusado', variant: 'destructive' },
    pending_send: { label: 'A Enviar', variant: 'secondary' },
    sent: { label: 'Enviado', variant: 'secondary' },
};


export default function QuotesPage() {
    const { quotes, isLoading } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const groupedQuotes = useMemo(() => {
        const filtered = (quotes || []).filter((quote: Quote) => {
            const matchesSearch = quote.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || quote.clientFeedback === statusFilter || quote.presentationStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });

        const groups: Record<QuoteGroup, Quote[]> = {
            inProgress: [],
            approved: [],
            rejected: [],
        };

        filtered.forEach(quote => {
            const groupKey = statusGroupMap[quote.clientFeedback] || statusGroupMap[quote.presentationStatus];
            if (groupKey) {
                groups[groupKey].push(quote);
            }
        });
        
        return groups;

    }, [quotes, searchTerm, statusFilter]);

    if (isLoading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <p>Carregando orçamentos...</p>
          </div>
        );
    }
    
    const QuoteGroup = ({ title, quotes }: { title: string, quotes: Quote[] }) => {
        if (quotes.length === 0) {
            return null;
        }
        return (
            <div className="space-y-4">
                <div className='flex items-center gap-3'>
                    <h3 className="font-headline text-xl font-semibold">{title}</h3>
                    <Badge variant="secondary">{quotes.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {quotes.map(quote => {
                        const statusKey = quote.clientFeedback || quote.presentationStatus;
                        const displayStatus = statusDisplayMap[statusKey];
                        return (
                            <Link href={`/quotes/${quote.id}`} key={quote.id}>
                                <Card className="h-full hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <CardTitle>{quote.clientName}</CardTitle>
                                        {displayStatus && <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>}
                                    </CardHeader>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            </div>
        );
    };

    const allQuotes = Object.values(groupedQuotes).flat();

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Orçamentos"
            description="Crie, gerencie e acompanhe suas propostas comerciais."
          />
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Orçamento
          </Button>
        </div>

         <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Buscar por cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as string)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                   {Object.entries(statusDisplayMap).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

           {allQuotes.length > 0 ? (
               <div className="space-y-8">
                  <QuoteGroup title={groupTitles.inProgress} quotes={groupedQuotes.inProgress} />
                  <QuoteGroup title={groupTitles.approved} quotes={groupedQuotes.approved} />
                  <QuoteGroup title={groupTitles.rejected} quotes={groupedQuotes.rejected} />
               </div>
           ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                  <div className="text-center p-4">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-headline text-xl font-semibold text-muted-foreground/80">
                      Nenhum orçamento encontrado
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                      Crie um novo orçamento para começar a gerir as suas propostas.
                  </p>
                  </div>
              </div>
           )}
      </div>
      <RegisterQuoteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
