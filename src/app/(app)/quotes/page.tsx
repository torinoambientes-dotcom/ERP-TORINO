'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'all';

const statusMap: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  sent: { label: 'Enviado', color: 'bg-blue-500' },
  approved: { label: 'Aprovado', color: 'bg-green-500' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500' },
  all: { label: 'Todos', color: '' },
};

export default function QuotesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<QuoteStatus>('all');
    
    // Dummy data for now
    const quotes: any[] = [];
    const isLoading = true;

    if (isLoading) {
        return (
          <div className="flex h-full w-full items-center justify-center">
            <p>Carregando orçamentos...</p>
          </div>
        );
    }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Orçamentos"
          description="Crie, gerencie e acompanhe suas propostas comerciais."
        />
        <Button className="w-full sm:w-auto">
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

         {quotes.length > 0 ? (
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Map over quotes here */}
             </div>
         ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                <div className="text-center p-4">
                <h3 className="font-headline text-xl font-semibold text-muted-foreground/80">
                    Nenhum orçamento encontrado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Crie um novo orçamento para começar.
                </p>
                </div>
            </div>
         )}
    </div>
  );
}
