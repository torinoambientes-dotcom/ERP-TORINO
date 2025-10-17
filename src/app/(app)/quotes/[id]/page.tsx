'use client';
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import type { Quote, StageStatus, TeamMember, QuoteStage, QuoteFurniture, QuoteEnvironment } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ChevronLeft, User, Package, Pencil, FileText, Download, CalendarIcon, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STAGE_STATUSES } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { QuoteMaterialsModal } from '@/components/modals/quote-materials-modal';
import { RegisterQuoteModal } from '@/components/modals/register-quote-modal';
import { QuoteFurnitureDescriptionModal } from '@/components/modals/quote-furniture-description-modal';
import jsPDF from 'jspdf';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { logoSvgString } from '@/components/logo';
import { useUser } from '@/firebase';


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
  const { quotes, teamMembers, updateQuote, isLoading, quoteMaterials, addProject } = useContext(AppContext);
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = useMemo(() => loggedInMember?.role === 'Administrativo', [loggedInMember]);


  const [quote, setQuote] = useState<Quote | null | undefined>(undefined);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMaterialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [isDescriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<QuoteFurniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);

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
      const newQuote = JSON.parse(JSON.stringify(currentQuote));
      
      if (!newQuote[stageKey]) {
        newQuote[stageKey] = { status: 'todo', responsibleIds: [] };
      }

      if (field === 'status') {
        (newQuote[stageKey] as QuoteStage).status = value;
      } else if (field === 'responsibleIds') {
        const currentIds = (newQuote[stageKey] as QuoteStage).responsibleIds || [];
        const memberId = value;
        if (currentIds.includes(memberId)) {
            (newQuote[stageKey] as QuoteStage).responsibleIds = currentIds.filter((id: string) => id !== memberId);
        } else {
            (newQuote[stageKey] as QuoteStage).responsibleIds = [...currentIds, memberId];
        }
      }
      
      updateQuote(newQuote.id, { [stageKey]: newQuote[stageKey] });
      return newQuote;
    });
  };
  
    const handleFurnitureUpdateInModal = useCallback((updatedFurniture: QuoteFurniture) => {
        setQuote(currentQuote => {
            if (!currentQuote || !selectedEnvironmentId) return currentQuote;

            const newQuote = JSON.parse(JSON.stringify(currentQuote));
            
            const envIndex = newQuote.environments.findIndex((e: QuoteEnvironment) => e.id === selectedEnvironmentId);
            if (envIndex === -1) return currentQuote;

            const furIndex = newQuote.environments[envIndex].furniture.findIndex((f: QuoteFurniture) => f.id === updatedFurniture.id);
            if (furIndex === -1) return currentQuote;
            
            newQuote.environments[envIndex].furniture[furIndex] = updatedFurniture;

            updateQuote(newQuote.id, { environments: newQuote.environments });
            return newQuote;
        });
    }, [selectedEnvironmentId, updateQuote]);


  const openMaterialsModal = useCallback((furniture: QuoteFurniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setMaterialsModalOpen(true);
  }, []);
  
  const openDescriptionModal = useCallback((furniture: QuoteFurniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setDescriptionModalOpen(true);
  }, []);

  const getFurnitureForModal = () => {
    if (!quote || !selectedEnvironmentId || !selectedFurniture) return null;
    const env = quote.environments.find(e => e.id === selectedEnvironmentId);
    if (!env) return null;
    return env.furniture.find(f => f.id === selectedFurniture.id) || null;
  }

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

  const handleDeliveryDeadlineChange = (date: Date | undefined) => {
    if (!quote || !date) return;
  
    const newProjectId = addProject({
      clientName: quote.clientName,
      deliveryDeadline: date.toISOString(),
      environments: quote.environments.map(env => ({
        name: env.name,
        furniture: env.furniture.map(fur => ({
          name: fur.name,
          materials: fur.materials,
          glassItems: fur.glassItems,
          profileDoors: fur.profileDoors,
        })),
      })),
    });
  
    if (newProjectId) {
        let updates: Partial<Quote> = { 
            deliveryDeadline: date.toISOString(),
            relatedProjectId: newProjectId
        };
        
        toast({
          title: "Projeto Criado com Sucesso!",
          description: `O projeto para ${quote.clientName} foi gerado a partir deste orçamento.`,
        });

        setQuote(currentQuote => {
            if (!currentQuote) return null;
            const newQuote = { ...currentQuote, ...updates };
            updateQuote(newQuote.id, updates);
            return newQuote;
        });

    } else {
      toast({
        variant: "destructive",
        title: "Erro ao criar projeto",
        description: "Não foi possível obter o ID do novo projeto.",
      });
      return; 
    }
  };

  const memberMap = useMemo(() => {
    if (!teamMembers) return new Map();
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);
  
  const totalProductionTime = useMemo(() => {
    if (!quote) return 0;
    return quote.environments.reduce((total, env) => {
      return total + (env.furniture || []).reduce((envTotal, fur) => {
        return envTotal + (fur.productionTime || 0);
      }, 0);
    }, 0);
  }, [quote]);

  const generatePDF = (isQuote: boolean) => {
    if (!quote) return;
  
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 35;
  
    const addHeader = (pageNumber: number) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(logoSvgString, "image/svg+xml");
      const svgElement = svgDoc.getElementsByTagName('svg')[0];
      doc.svg(svgElement, { x: margin, y: 12, width: 30, height: 10 });
  
      const title = isQuote ? 'Proposta Comercial' : 'Memorial Descritivo';
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.text(title, pageWidth - margin - titleWidth, 20);
    };
  
    const addFooter = (pageNumber: number, totalPages: number) => {
        const footerY = pageHeight - 15;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#666666');
        
        const footerText = "Torino Ambientes | torinoambientes@gmail.com";
        doc.text(footerText, margin, footerY);
  
        const pageText = `Página ${pageNumber} de ${totalPages}`;
        const pageTextWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(pageText, pageWidth - margin - pageTextWidth, footerY);
    };
  
    const checkPageBreak = (requiredHeight: number, isContentBlock = false) => {
        const footerMargin = isContentBlock ? 40 : 25;
        if (y + requiredHeight > pageHeight - footerMargin) {
            doc.addPage();
            y = 35;
            return true;
        }
        return false;
    };
  
    addHeader(1);
  
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Cliente:`, margin, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${quote.clientName}`, margin + 20, y);
  
    const dateText = `Data: ${new Date().toLocaleDateString('pt-BR')}`;
    const dateWidth = doc.getStringUnitWidth(dateText) * doc.getFontSize() / doc.internal.scaleFactor;
    doc.text(dateText, pageWidth - margin - dateWidth, y);
    y += 12;
  
    let totalQuoteValue = 0;
  
    const processEnvironment = (env: QuoteEnvironment, isFirstOnPage: boolean) => {
        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
        
        const envNameText = env.name;
        let environmentValue = 0;
        if(isQuote){
            environmentValue = (env.furniture || []).reduce((envAcc, fur) => envAcc + (fur.materials || []).reduce((matAcc, mat) => matAcc + (mat.quantity * (mat.cost || 0) * (mat.markup || 1)), 0), 0);
            totalQuoteValue += environmentValue;
        }
        const envValueText = `- R$ ${environmentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
        let requiredHeight = lineHeight + (isFirstOnPage ? 10 : 8); 
        
        const furnituresContent = (env.furniture || []).map(fur => {
            const furNameHeight = lineHeight;
            const descriptionLines = doc.splitTextToSize(fur.description || 'Nenhum descritivo fornecido.', pageWidth - (margin * 2));
            const descHeight = descriptionLines.length * (lineHeight * 0.9);
            const furBlockHeight = furNameHeight + descHeight + 6;
            return { fur, furBlockHeight, descriptionLines };
        });
  
        requiredHeight += furnituresContent.reduce((acc, content) => acc + content.furBlockHeight, 0);
  
        if (checkPageBreak(requiredHeight, false)) {
        }
  
        if (isFirstOnPage) {
            y += 5;
        } else {
            y += 8;
        }
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(envNameText, margin, y);
  
        if(isQuote){
            doc.setFont('Helvetica', 'normal');
            doc.text(envValueText, margin + doc.getStringUnitWidth(envNameText) * doc.getFontSize() / doc.internal.scaleFactor + 3, y);
        }
        y += 4;
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
  
        furnituresContent.forEach(item => {
            if (checkPageBreak(item.furBlockHeight, true)) {
            }
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(item.fur.name, margin, y);
            y += 6;
  
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#666666');
            doc.text(item.descriptionLines, margin, y);
            y += item.descriptionLines.length * (lineHeight * 0.9) + 6;
            doc.setTextColor('#000000');
        });
    };
  
    quote.environments.forEach((env, index) => {
        processEnvironment(env, index === 0);
    });
  
    if (isQuote) {
        if (checkPageBreak(30)) {
        }
        y += 10;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        const totalText = `Valor Total do Orçamento: R$ ${totalQuoteValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const totalTextWidth = doc.getStringUnitWidth(totalText) * doc.getFontSize() / doc.internal.scaleFactor;
        doc.text(totalText, pageWidth - margin - totalTextWidth, y);
        y += 15;
    }
    
    if (checkPageBreak(20)) {
    }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observações:', margin, y);
    y += 5;
  
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('- Orçamento válido por 15 dias.', margin, y);
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i > 1) addHeader(i);
      addFooter(i, totalPages);
    }
    
    const fileName = `${isQuote ? 'Orcamento' : 'Descritivo'}_${quote.clientName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  };
  

  if (quote === undefined || isLoading || !loggedInMember) {
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
    <>
    <div className="space-y-8">
        <div>
          <Button variant="ghost" asChild className="-ml-4">
            <Link href="/quotes">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para orçamentos
            </Link>
          </Button>
           <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <PageHeader
                title={quote.clientName}
                description="Detalhes do orçamento e acompanhamento das etapas."
              />
              <div className="flex items-center gap-2">
                <Card className="flex items-center gap-2 p-2 text-sm">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <span className="font-semibold">{totalProductionTime} horas</span>
                    <p className="text-xs text-muted-foreground">de produção estimada</p>
                  </div>
                </Card>
                {isAdmin && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                )}
              </div>
           </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recebimento do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
                 {quote.projectOrigin === 'internal_development' && quote.internalProjectStage ? (
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
            <CardContent className="space-y-4">
                 <Select value={quote.clientFeedback} onValueChange={(value) => handleSimpleStatusChange('clientFeedback', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(clientFeedbackMap).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                {quote.clientFeedback === 'approved' && isAdmin && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Prazo de Entrega</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !quote.deliveryDeadline && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {quote.deliveryDeadline
                                        ? format(new Date(quote.deliveryDeadline), "PPP")
                                        : <span>Definir prazo</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={quote.deliveryDeadline ? new Date(quote.deliveryDeadline) : undefined}
                                    onSelect={handleDeliveryDeadlineChange}
                                    disabled={(date) => date < new Date()}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                         {quote.relatedProjectId && (
                            <Button asChild variant="outline" size="sm" className="w-full mt-2">
                                <Link href={`/projects/${quote.relatedProjectId}`}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Projeto Criado. Ver Projeto
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

      </div>
      
        <Separator />

        <div>
            <h2 className="text-2xl font-headline font-semibold mb-4">Ambientes e Móveis do Orçamento</h2>
            {quote.environments?.length > 0 ? (
                <Accordion type="multiple" className="space-y-4" defaultValue={quote.environments.map(e => e.id)}>
                {quote.environments.map((env) => {
                  const totalCost = (env.furniture || []).reduce((envAcc, fur) => {
                    const furnitureValue = (fur.materials || []).reduce((matAcc, mat) => {
                        return matAcc + (mat.quantity * (mat.cost || 0) * (mat.markup || 1));
                    }, 0);
                    return envAcc + furnitureValue;
                  }, 0);

                  return (
                    <AccordionItem key={env.id} value={env.id} className="border-none">
                    <div className="bg-card rounded-lg overflow-hidden border">
                        <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline">
                        <div className="flex-grow flex flex-col items-start text-left gap-2">
                            <h3 className="font-headline text-xl">{env.name}</h3>
                            {isAdmin && (
                              <p className="text-sm text-primary font-semibold">Valor do Orçamento (Ambiente): R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            )}
                        </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 sm:p-6 space-y-6">
                        {(env.furniture || []).map((fur, index) => {
                          const furnitureCost = (fur.materials || []).reduce((acc, mat) => acc + (mat.quantity * (mat.cost || 0) * (mat.markup || 1)), 0);
                          return (
                            <div key={fur.id}>
                            {index > 0 && <Separator className="mb-6" />}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                <div className="flex-grow">
                                  <h4 className="font-semibold text-lg">{fur.name}</h4>
                                   <div className='flex items-center gap-4 text-xs mt-1'>
                                    {isAdmin && (
                                      <p className="text-primary font-semibold">Valor: R$ {furnitureCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    )}
                                    {fur.productionTime && fur.productionTime > 0 && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{fur.productionTime} horas</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button variant="outline" size="sm" onClick={() => openDescriptionModal(fur, env.id)} className="w-full sm:w-auto flex-1">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Descritivo
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => openMaterialsModal(fur, env.id)} className="w-full sm:w-auto flex-1">
                                        <Package className="mr-2 h-4 w-4" />
                                        {isAdmin ? "Custos" : "Materiais"}
                                    </Button>
                                </div>
                            </div>
                            {fur.description && <p className="text-sm text-muted-foreground -mt-2 mb-4 italic p-3 border-l-2">{fur.description}</p>}
                            </div>
                          );
                        })}
                        </AccordionContent>
                    </div>
                    </AccordionItem>
                )})}
                </Accordion>
            ) : (
                <p>Nenhum ambiente cadastrado para este orçamento.</p>
            )}
        </div>
        
        {isAdmin && (
            <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" onClick={() => generatePDF(false)}>
                    <Download className="mr-2 h-5 w-5" />
                    Gerar Descritivo PDF
                </Button>
                <Button size="lg" variant="default" onClick={() => generatePDF(true)}>
                    <Download className="mr-2 h-5 w-5" />
                    Gerar Orçamento PDF
                </Button>
            </div>
        )}

    </div>
    {getFurnitureForModal() && (
        <QuoteMaterialsModal
            isOpen={isMaterialsModalOpen}
            onClose={() => setMaterialsModalOpen(false)}
            furniture={getFurnitureForModal()!}
            onUpdate={handleFurnitureUpdateInModal}
            clientName={quote.clientName}
            quoteMaterials={quoteMaterials}
        />
      )}
       {getFurnitureForModal() && (
        <QuoteFurnitureDescriptionModal
            isOpen={isDescriptionModalOpen}
            onClose={() => setDescriptionModalOpen(false)}
            furniture={getFurnitureForModal()!}
            onUpdate={handleFurnitureUpdateInModal}
        />
      )}
       {isEditModalOpen && (
        <RegisterQuoteModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          quoteToEdit={quote}
        />
      )}
    </>
  );

    
}
