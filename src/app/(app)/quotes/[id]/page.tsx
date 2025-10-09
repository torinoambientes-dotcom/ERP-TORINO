'use client';
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import type { Quote, StageStatus, TeamMember, QuoteStage } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ChevronLeft, User } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAGE_STATUSES } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


type StageKey = 'internalProjectStage' | 'materialSurveyStage' | 'descriptiveStage';

const statusColors: Record<StageStatus, string> = {
  todo: 'bg-amber-100 border-amber-200 text-amber-800',
  in_progress: 'bg-blue-100 border-blue-200 text-blue-800',
  done: 'bg-green-100 border-green-200 text-green-800',
};

const presentationStatusMap = {
  pending_send: "A Enviar",
  sent: "Enviado",
};

const clientFeedbackMap = {
  analyzing: "Em Análise",
  approved: "Pedido Fechado",
  rejected: "Pedido Recusado",
  revision: "Rever Orçamento",
};

export default function QuoteDetailsPage() {
  const { quotes, teamMembers, updateQuote, isLoading } = useContext(AppContext);
  const params = useParams();
  const id = params.id as string;

  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoading && quotes) {
      const foundQuote = quotes.find((q) => q.id === id);
      setQuote(foundQuote ? JSON.parse(JSON.stringify(foundQuote)) : null);
    }
  }, [id, quotes, isLoading]);

  const handleStageChange = (
    stageKey: StageKey,
    field: 'status' | 'responsibleIds',
    value: any
  ) => {
    setQuote(currentQuote => {
      if (!currentQuote) return null;
      const newQuote = { ...currentQuote };
      
      if (!newQuote[stageKey]) {
        newQuote[stageKey] = { status: 'todo', responsibleIds: [] };
      }

      if (field === 'status') {
        newQuote[stageKey]!.status = value;
      } else if (field === 'responsibleIds') {
        const currentIds = newQuote[stageKey]!.responsibleIds || [];
        const memberId = value;
        if (currentIds.includes(memberId)) {
            newQuote[stageKey]!.responsibleIds = currentIds.filter((id: string) => id !== memberId);
        } else {
            newQuote[stageKey]!.responsibleIds = [...currentIds, memberId];
        }
      }
      
      updateQuote(newQuote.id, { [stageKey]: newQuote[stageKey] });
      return newQuote;
    });
  };

  const handleSimpleStatusChange = (
    field: 'presentationStatus' | 'clientFeedback',
    value: any
  ) => {
    setQuote(currentQuote => {
        if (!currentQuote) return null;
        const newQuote = { ...currentQuote, [field]: value };
        updateQuote(newQuote.id, { [field]: value });
        return newQuote;
    });
  };

  const memberMap = useMemo(() => {
    if (!teamMembers) return new Map();
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);

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

  const StageCard = ({ stageKey, title, description }: { stageKey: StageKey, title: string, description: string }) => {
    const stageData = quote[stageKey] || { status: 'todo', responsibleIds: [] };
    const responsibleMembers = (stageData.responsibleIds || [])
      .map(id => memberMap.get(id))
      .filter((m): m is TeamMember => !!m);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={stageData.status} onValueChange={(value: StageStatus) => handleStageChange(stageKey, 'status', value)}>
                    <SelectTrigger className={cn("font-semibold", statusColors[stageData.status])}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STAGE_STATUSES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Responsáveis</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start h-10">
                            <div className="flex items-center gap-2 truncate">
                                {responsibleMembers.length > 0 ? (
                                    <div className="flex items-center -space-x-2">
                                        {responsibleMembers.slice(0, 3).map(member => (
                                            <Avatar key={member.id} className="h-6 w-6 border-background">
                                                <AvatarImage src={member.avatarUrl} />
                                                <AvatarFallback style={{ backgroundColor: member.color }} className="text-xs">{getInitials(member.name)}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                ) : (
                                    <User className="h-5 w-5 text-muted-foreground" />
                                )}
                                <span className='truncate text-sm text-muted-foreground'>
                                    {responsibleMembers.length > 0
                                        ? responsibleMembers.map(m => m.name.split(' ')[0]).join(', ')
                                        : 'Não atribuído'}
                                </span>
                            </div>
                        </Button>
                    </PopoverTrigger>
                     <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Buscar membro..." />
                            <CommandList>
                                <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                <CommandGroup>
                                {teamMembers?.map((member) => (
                                    <CommandItem
                                        key={member.id}
                                        onSelect={() => handleStageChange(stageKey, 'responsibleIds', member.id)}
                                        className="cursor-pointer"
                                    >
                                        <Checkbox className='mr-2' checked={(stageData.responsibleIds || []).includes(member.id)} />
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6"><AvatarImage src={member.avatarUrl} /><AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>{getInitials(member.name)}</AvatarFallback></Avatar>
                                          <span>{member.name}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </CardContent>
      </Card>
    )
  };


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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recebimento do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
                 {quote.projectOrigin === 'internal_development' ? (
                   <StageCard 
                      stageKey="internalProjectStage"
                      title="Desenvolvimento do Projeto Interno"
                      description="Acompanhe a criação do projeto pela nossa equipa."
                    />
                 ) : (
                    <p className='text-sm text-muted-foreground p-4 text-center border rounded-lg bg-muted/50'>Este orçamento é baseado num projeto fornecido pelo arquiteto/cliente.</p>
                 )}
            </CardContent>
        </Card>
        
        <StageCard
          stageKey="materialSurveyStage"
          title="Levantamento de Materiais"
          description="Etapa para levantar todos os custos e materiais para a produção."
        />

        <StageCard
          stageKey="descriptiveStage"
          title="Descritivo"
          description="Etapa para descrever os ambientes e móveis para a apresentação."
        />

        <Card>
            <CardHeader><CardTitle>Envio ao Cliente</CardTitle></CardHeader>
            <CardContent>
                <Select value={quote.presentationStatus} onValueChange={(value) => handleSimpleStatusChange('presentationStatus', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(presentationStatusMap).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Devolutiva do Cliente</CardTitle></CardHeader>
            <CardContent>
                 <Select value={quote.clientFeedback} onValueChange={(value) => handleSimpleStatusChange('clientFeedback', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(clientFeedbackMap).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
