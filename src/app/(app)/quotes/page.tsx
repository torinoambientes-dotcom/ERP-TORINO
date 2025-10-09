'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileText } from 'lucide-react';
import { AppContext } from '@/context/app-context';
import { RegisterQuoteModal } from '@/components/modals/register-quote-modal';
import type { QuoteStatus } from '@/lib/types';

const statusMap: Record<QuoteStatus | 'all', { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  sent: { label: 'Enviado', color: 'bg-blue-500' },
  approved: { label: 'Aprovado', color: 'bg-green-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500' },
  all: { label: 'Todos', color: '' },
};

export default function QuotesPage() {
    const { quotes, isLoading } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');

    if (isLoading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <p>Carregando orçamentos...</p>
          </div>
        );
    }

    const filteredQuotes = (quotes || []).filter(quote => {
        const matchesSearch = quote.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
                onValueChange={(value) => setStatusFilter(value as QuoteStatus)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                   {Object.entries(statusMap).filter(([key]) => key !== 'all').map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

           {filteredQuotes.length > 0 ? (
               <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredQuotes.map(quote => (
                    <Link href={`/quotes/${quote.id}`} key={quote.id}>
                        <Card className="h-full hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle>{quote.clientName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Status: {statusMap[quote.status].label}</p>
                                <p>Valor: R$ {quote.totalValue.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    </Link>
                  ))}
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
