'use client';

import { useState, useContext, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, FileText, Database, Archive, Trash2 } from 'lucide-react';
import { AppContext } from '@/context/app-context';
import { RegisterQuoteModal } from '@/components/modals/register-quote-modal';
import type { Quote } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { DeleteProjectAlert } from '@/components/modals/delete-project-alert';
import { useUser } from '@/firebase';


type QuoteGroup = 'inProgress' | 'approved' | 'rejected' | 'archived';

const statusGroupMap: Record<string, QuoteGroup> = {
  analyzing: 'inProgress',
  pending_send: 'inProgress',
  sent: 'inProgress',
  revision: 'inProgress',
  approved: 'approved',
  rejected: 'rejected',
};

const groupTitles: Record<QuoteGroup, string> = {
  inProgress: 'Em Andamento',
  approved: 'Fechados',
  rejected: 'Recusados',
  archived: 'Arquivados'
};

const statusDisplayMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    analyzing: { label: 'Em Análise', variant: 'outline' },
    approved: { label: 'Aprovado', variant: 'default' },
    rejected: { label: 'Recusado', variant: 'destructive' },
    pending_send: { label: 'A Enviar', variant: 'secondary' },
    sent: { label: 'Enviado', variant: 'secondary' },
    revision: { label: 'Revisão', variant: 'outline'},
};


export default function QuotesPage() {
    const { quotes, deleteQuote, updateQuote, isLoading, teamMembers } = useContext(AppContext);
    const { user } = useUser();

    const loggedInMember = useMemo(() => {
      if (!user || !teamMembers) return null;
      return teamMembers.find(member => member.id === user.uid);
    }, [user, teamMembers]);

    const isAdmin = useMemo(() => loggedInMember?.role === 'Administrativo', [loggedInMember]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showArchived, setShowArchived] = useState(false);

    const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

    const handleArchiveToggle = useCallback((e: React.MouseEvent, quote: Quote) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuote(quote.id, { isArchived: !quote.isArchived });
    }, [updateQuote]);

    const openDeleteModal = useCallback((e: React.MouseEvent, quote: Quote) => {
        e.preventDefault();
        e.stopPropagation();
        setQuoteToDelete(quote);
    }, []);

    const confirmDelete = useCallback(() => {
        if(quoteToDelete) {
            deleteQuote(quoteToDelete.id);
            setQuoteToDelete(null);
        }
    }, [quoteToDelete, deleteQuote]);

    const groupedQuotes = useMemo(() => {
        const filtered = (quotes || []).filter((quote: Quote) => {
            const matchesSearch = quote.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || quote.clientFeedback === statusFilter || (statusFilter === 'pending_send' && quote.presentationStatus === 'pending_send');
            const matchesArchived = showArchived ? quote.isArchived === true : !quote.isArchived;
            return matchesSearch && matchesStatus && matchesArchived;
        });

        const groups: Record<QuoteGroup, Quote[]> = {
            inProgress: [],
            approved: [],
            rejected: [],
            archived: [],
        };
        
        filtered.forEach(quote => {
          if (quote.isArchived) {
              groups.archived.push(quote);
          } else {
              const groupKey = statusGroupMap[quote.clientFeedback] || statusGroupMap[quote.presentationStatus] || 'inProgress';
              groups[groupKey].push(quote);
          }
        });
        
        return groups;

    }, [quotes, searchTerm, statusFilter, showArchived]);

    if (isLoading || !loggedInMember) {
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
                        const statusKey = quote.isArchived ? 'archived' : (quote.clientFeedback || quote.presentationStatus);
                        const displayStatus = statusDisplayMap[statusKey];
                        return (
                           <div key={quote.id} className="relative group">
                             <Link href={`/quotes/${quote.id}`}>
                                <Card className="h-full hover:shadow-lg transition-shadow">
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <CardTitle>{quote.clientName}</CardTitle>
                                        {displayStatus && <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>}
                                        {quote.isArchived && <Badge variant="outline">Arquivado</Badge>}
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{(quote.environments || []).length} ambiente(s)</p>
                                    </CardContent>
                                </Card>
                              </Link>
                              <CardFooter className="absolute bottom-2 right-2 flex justify-end gap-1 bg-card/50 backdrop-blur-sm rounded-full p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => handleArchiveToggle(e, quote)}>
                                      <Archive className="h-4 w-4" />
                                      <span className="sr-only">{quote.isArchived ? 'Desarquivar' : 'Arquivar'}</span>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={(e) => openDeleteModal(e, quote)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Remover</span>
                                  </Button>
                              </CardFooter>
                           </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const allVisibleQuotes = Object.values(groupedQuotes).flat();

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Orçamentos"
            description="Crie, gerencie e acompanhe suas propostas comerciais."
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowArchived(!showArchived)} variant="outline" className="w-full sm:w-auto">
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? "Ver Ativos" : "Ver Arquivados"}
            </Button>
            {isAdmin && (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/quotes/materials">
                    <Database className="mr-2 h-4 w-4" />
                    Gerir Materiais
                </Link>
                </Button>
            )}
            <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </div>
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
                disabled={showArchived}
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

           {allVisibleQuotes.length > 0 ? (
               <div className="space-y-8">
                  {showArchived ? (
                    <QuoteGroup title={groupTitles.archived} quotes={groupedQuotes.archived} />
                  ) : (
                    <>
                      <QuoteGroup title={groupTitles.inProgress} quotes={groupedQuotes.inProgress} />
                      <QuoteGroup title={groupTitles.approved} quotes={groupedQuotes.approved} />
                      <QuoteGroup title={groupTitles.rejected} quotes={groupedQuotes.rejected} />
                    </>
                  )}
               </div>
           ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                  <div className="text-center p-4">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-headline text-xl font-semibold text-muted-foreground/80">
                      Nenhum orçamento encontrado
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                      {showArchived ? "Não há orçamentos arquivados." : "Crie um novo orçamento para começar a gerir as suas propostas."}
                  </p>
                  </div>
              </div>
           )}
      </div>
      <RegisterQuoteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <DeleteProjectAlert 
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={confirmDelete}
        projectName={quoteToDelete?.clientName || ''}
      />
    </>
  );
}
