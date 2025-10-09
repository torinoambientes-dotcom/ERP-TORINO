'use client';
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ChevronLeft, MessageSquare, Package, ListTodo, CalendarIcon, XCircle, Flag, User, X, Pencil } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { Project, Furniture, StageStatus, TeamMember, ProductionStage, Priority, Environment } from '@/lib/types';
import { STAGE_STATUSES } from '@/lib/types';
import { FurniturePendenciesModal } from '@/components/modals/furniture-pendencies-modal';
import { FurnitureConversationModal } from '@/components/modals/furniture-conversation-modal';
import { FurnitureMaterialsModal } from '@/components/modals/furniture-materials-modal';
import { cn, getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RegisterProjectModal } from '@/components/modals/register-project-modal';


type StageKey = 'measurement' | 'cutting' | 'purchase' | 'assembly';
const stages: { key: StageKey; label: string }[] = [
  { key: 'measurement', label: 'Medição' },
  { key: 'cutting', label: 'Plano de Corte' },
  { key: 'purchase', label: 'Compra Material' },
  { key: 'assembly', label: 'Pré Montagem' },
];

const statusColors: Record<StageStatus, string> = {
  todo: 'bg-amber-100 border-amber-200 text-amber-800',
  in_progress: 'bg-blue-100 border-blue-200 text-blue-800',
  done: 'bg-green-100 border-green-200 text-green-800',
};

const priorityMap: Record<Priority, { label: string; className: string }> = {
    low: { label: 'Baixa', className: 'text-gray-500' },
    medium: { label: 'Média', className: 'text-yellow-500' },
    high: { label: 'Alta', className: 'text-red-500' },
};


export default function ProjectDetailsPage() {
  const { projects, teamMembers, updateProject, isLoading } = useContext(AppContext);
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null | undefined>(undefined);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPendencyModalOpen, setPendencyModalOpen] = useState(false);
  const [isConversationModalOpen, setConversationModalOpen] = useState(false);
  const [isMaterialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  
  const defaultOpenAccordionItems = useMemo(() => {
    if (project?.environments) {
      return project.environments.map(env => env.id);
    }
    return [];
  }, [project]);

  useEffect(() => {
    if (!isLoading && projects) {
      const foundProject = projects.find((p) => p.id === id);
      setProject(foundProject ? JSON.parse(JSON.stringify(foundProject)) : null);
    }
  }, [id, projects, isLoading]);
  
  const handleStageChange = useCallback((
    envId: string,
    furId: string,
    stage: StageKey,
    key: 'status' | 'responsibleIds' | 'scheduledFor' | 'priority',
    value: any
  ) => {
    setProject(currentProject => {
      if (!currentProject) return null;

      const newProject = JSON.parse(JSON.stringify(currentProject));
      const env = newProject.environments.find((e: any) => e.id === envId);
      if (env) {
        const fur = env.furniture.find((f: any) => f.id === furId);
        if (fur) {
          if (!fur[stage]) {
            fur[stage] = { status: 'todo' };
          }
          
          if (key === 'responsibleIds') {
            const currentIds = fur[stage].responsibleIds || [];
            const memberId = value;
            if (currentIds.includes(memberId)) {
                fur[stage].responsibleIds = currentIds.filter((id: string) => id !== memberId);
            } else {
                fur[stage].responsibleIds = [...currentIds, memberId];
            }
          } else if (key === 'scheduledFor') {
            fur[stage].scheduledFor = value instanceof Date ? value.toISOString() : value;
          } else if (key === 'priority') {
            fur[stage].priority = value as Priority;
          } else if (key === 'status') {
             const previousStatus = fur[stage].status;
             const newStatus = value as StageStatus;
             fur[stage].status = newStatus;

             if (newStatus === 'in_progress' && previousStatus === 'todo') {
                 fur[stage].startedAt = new Date().toISOString();
             } else if (newStatus === 'done' && !fur[stage].completedAt) {
                 fur[stage].completedAt = new Date().toISOString();
                 // If it's being marked done, ensure it has a start date
                 if (!fur[stage].startedAt) {
                    fur[stage].startedAt = fur[stage].completedAt;
                 }
             } else if (newStatus !== 'done') {
                 // If status is reverted from 'done', clear completion date
                 delete fur[stage].completedAt;
             }
          }
        }
      }
      // Trigger update to Firestore non-blockingly
      updateProject(newProject, currentProject);
      // Return the new state for immediate UI update
      return newProject;
    });
  }, [updateProject]);

  const handleFurnitureUpdateInModal = useCallback((updatedFurniture: Furniture) => {
    setProject(currentProject => {
        if (!currentProject || !selectedEnvironmentId) return currentProject;

        const newProject = JSON.parse(JSON.stringify(currentProject));
        
        const envIndex = newProject.environments.findIndex((e: any) => e.id === selectedEnvironmentId);
        if (envIndex === -1) return currentProject;

        const furIndex = newProject.environments[envIndex].furniture.findIndex((f: any) => f.id === updatedFurniture.id);
        if (furIndex === -1) return currentProject;

        // Create a deep copy of the original project BEFORE making changes
        const originalProjectForComparison = JSON.parse(JSON.stringify(currentProject));
        
        // Apply the update
        newProject.environments[envIndex].furniture[furIndex] = updatedFurniture;

        // Call updateProject with the new state and the original state
        updateProject(newProject, originalProjectForComparison);

        // Return the new state for immediate UI update
        return newProject;
    });
  }, [selectedEnvironmentId, updateProject]);


  const openPendencyModal = useCallback((furniture: Furniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setPendencyModalOpen(true);
  }, []);

  const openConversationModal = useCallback((furniture: Furniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setConversationModalOpen(true);
  }, []);
  
  const openMaterialsModal = useCallback((furniture: Furniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setMaterialsModalOpen(true);
  }, []);

  const memberMap = useMemo(() => {
    if (!teamMembers) return new Map();
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);
  
  const { marceneiros, outrosMembros } = useMemo(() => {
    const marceneiros: TeamMember[] = [];
    const outrosMembros: TeamMember[] = [];
    (teamMembers || []).forEach(member => {
      if (member.role === 'Marceneiro') {
        marceneiros.push(member);
      } else {
        outrosMembros.push(member);
      }
    });
    return { marceneiros, outrosMembros };
  }, [teamMembers]);

  if (project === undefined || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando projeto...</p>
      </div>
    );
  }

  if (project === null) {
      notFound();
  }

  const getFurnitureForModal = () => {
    if (!project || !selectedEnvironmentId || !selectedFurniture) return null;
    const env = project.environments.find(e => e.id === selectedEnvironmentId);
    if (!env) return null;
    return env.furniture.find(f => f.id === selectedFurniture.id) || null;
  }
  
  const getEnvironmentStatus = (env: Environment) => {
      let totalTasks = 0;
      let doneTasks = 0;
      let hasStarted = false;

      (env.furniture || []).forEach(fur => {
          stages.forEach(stage => {
              totalTasks++;
              if (fur[stage.key]?.status === 'done') {
                  doneTasks++;
              }
              if (fur[stage.key]?.status === 'in_progress') {
                  hasStarted = true;
              }
          });
      });
      
      const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
      
      let status: 'Novo' | 'Em Andamento' | 'Concluído' = 'Novo';
      if (progress === 100) status = 'Concluído';
      else if (progress > 0 || hasStarted || doneTasks > 0) status = 'Em Andamento';
      
      return { status, progress };
  };


  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" asChild className="-ml-4">
              <Link href="/projects">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar para projetos
              </Link>
            </Button>
            <div className="flex items-center gap-4">
                <PageHeader
                title={project.clientName}
                description="Detalhes do projeto, ambientes e status das etapas."
                />
                 <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Projeto
                </Button>
            </div>
          </div>
        </div>

        {defaultOpenAccordionItems.length > 0 && (
          <Accordion type="multiple" defaultValue={defaultOpenAccordionItems} className="space-y-4">
            {project.environments?.map((env) => {
              
              const {status, progress} = getEnvironmentStatus(env);
              const furnitureCount = env.furniture?.length || 0;
              const unresolvedPendenciesCount = (env.furniture || []).reduce((acc, fur) => acc + (fur.pendencies || []).filter(p => !p.isResolved).length, 0);
              
              const statusConfig = {
                    'Novo': { variant: 'secondary' as const, className: '' },
                    'Em Andamento': { variant: 'outline' as const, className: 'text-blue-700 border-blue-600/30 bg-blue-600/10' },
                    'Concluído': { variant: 'default' as const, className: 'bg-green-600/20 text-green-700 border-green-600/30' },
              };


              return (
              <AccordionItem key={env.id} value={env.id} className="border-none">
                 <div className="bg-card rounded-lg overflow-hidden border">
                    <AccordionTrigger className="p-4 bg-muted/50 hover:no-underline [&[data-state=closed]>div>div]:opacity-0 [&[data-state=closed]>div>div]:h-0 [&[data-state=open]>div>div]:opacity-100 [&[data-state=open]>div>div]:h-auto">
                        <div className="flex-grow flex flex-col items-start text-left gap-2">
                           <h3 className="font-headline text-xl">{env.name}</h3>
                           <div className="flex items-center gap-4 transition-all duration-300 ease-in-out w-full">
                              <Progress value={progress} className="w-1/2 h-1.5" />
                              <div className='flex gap-2 items-center'>
                                <Badge variant={statusConfig[status].variant} className={cn('text-xs', statusConfig[status].className)}>{status}</Badge>
                                <Badge variant="secondary" className="text-xs">{furnitureCount} móvel(eis)</Badge>
                                {unresolvedPendenciesCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">{unresolvedPendenciesCount} pendência(s)</Badge>
                                )}
                              </div>
                           </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 sm:p-6 space-y-6">
                        {env.furniture?.map((fur, index) => {
                            const unresolvedPendencies = fur.pendencies?.filter(p => !p.isResolved).length || 0;
                            const commentsCount = fur.comments?.length || 0;
                            return (
                            <div key={fur.id}>
                                {index > 0 && <Separator className="mb-6" />}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                    <h4 className="font-semibold text-lg">{fur.name}</h4>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button variant="outline" size="sm" onClick={() => openMaterialsModal(fur, env.id)} className="w-full sm:w-auto flex-1">
                                            <Package className="mr-2 h-4 w-4" />
                                            Materiais
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openPendencyModal(fur, env.id)} className="w-full sm:w-auto relative flex-1">
                                            <ListTodo className="mr-2 h-4 w-4" />
                                            Pendências
                                            {unresolvedPendencies > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                                {unresolvedPendencies}
                                                </span>
                                            )}
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => openConversationModal(fur, env.id)} className="w-full sm:w-auto relative flex-1">
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Conversa
                                            {commentsCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                                                {commentsCount}
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {stages.map((stage) => {
                                    const stageData = fur[stage.key] || { status: 'todo' };
                                    const responsibleMembers = (stageData.responsibleIds || [])
                                        .map(id => memberMap.get(id))
                                        .filter((m): m is TeamMember => !!m);
                                    
                                    const responsibleList = stage.key === 'assembly' ? marceneiros : outrosMembros;
                                    const currentPriority = stageData.priority || 'medium';
                                    
                                    return (
                                    <div key={stage.key} className="space-y-2">
                                        <label className="text-sm font-medium">{stage.label}</label>
                                        <Select
                                        value={stageData.status}
                                        onValueChange={(value: StageStatus) =>
                                            handleStageChange(env.id, fur.id, stage.key, 'status', value)
                                        }
                                        >
                                        <SelectTrigger className={cn("font-semibold", statusColors[stageData.status])}>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STAGE_STATUSES).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        
                                        <div className="flex items-center gap-1">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full justify-start h-10">
                                                    <div className="flex items-center gap-2 truncate">
                                                        {responsibleMembers.length > 0 ? (
                                                            <div className="flex items-center -space-x-2">
                                                                {responsibleMembers.slice(0, 2).map(member => (
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
                                                        {responsibleMembers.length > 2 && (
                                                            <span className='text-xs text-muted-foreground'>+{responsibleMembers.length - 2}</span>
                                                        )}
                                                    </div>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar membro..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                        {responsibleList?.map((member) => (
                                                            <CommandItem
                                                                key={member.id}
                                                                onSelect={() => handleStageChange(env.id, fur.id, stage.key, 'responsibleIds', member.id)}
                                                                className="cursor-pointer"
                                                            >
                                                                <Checkbox
                                                                    className='mr-2'
                                                                    checked={(stageData.responsibleIds || []).includes(member.id)}
                                                                />
                                                                <Avatar className="h-6 w-6 mr-2">
                                                                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                                                    <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>{getInitials(member.name)}</AvatarFallback>
                                                                </Avatar>
                                                                <span>{member.name}</span>
                                                            </CommandItem>
                                                        ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <Button variant={"outline"} size="icon" className={cn("w-10 h-10", !stageData.scheduledFor && "text-muted-foreground")}>
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={stageData.scheduledFor ? new Date(stageData.scheduledFor) : undefined}
                                                onSelect={(date) => handleStageChange(env.id, fur.id, stage.key, 'scheduledFor', date)}
                                                initialFocus
                                            />
                                            </PopoverContent>
                                        </Popover>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant={"outline"} size="icon" className={cn("w-10 h-10", priorityMap[currentPriority].className)}>
                                                    <Flag className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {(Object.keys(priorityMap) as Priority[]).map(p => (
                                                    <DropdownMenuItem key={p} onClick={() => handleStageChange(env.id, fur.id, stage.key, 'priority', p)}>
                                                        <Flag className={cn("mr-2 h-4 w-4", priorityMap[p].className)} />
                                                        <span>{priorityMap[p].label}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        </div>
                                        {stageData.scheduledFor && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                            <span>Agendado: {format(new Date(stageData.scheduledFor), "dd/MM/yy")}</span>
                                            <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 text-destructive/50 hover:text-destructive"
                                            onClick={() => handleStageChange(env.id, fur.id, stage.key, 'scheduledFor', undefined)}
                                            >
                                            <XCircle className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        )}
                                    </div>
                                    )})}
                                </div>
                            </div>
                            )
                        })}
                    </AccordionContent>
                 </div>
              </AccordionItem>
            )})}
          </Accordion>
        )}
      </div>

       {getFurnitureForModal() && (
        <FurniturePendenciesModal
          isOpen={isPendencyModalOpen}
          onClose={() => setPendencyModalOpen(false)}
          furniture={getFurnitureForModal()!}
          onUpdate={(updatedFurniture) => handleFurnitureUpdateInModal(updatedFurniture)}
        />
      )}

      {getFurnitureForModal() && (
        <FurnitureConversationModal
          isOpen={isConversationModalOpen}
          onClose={() => setConversationModalOpen(false)}
          furniture={getFurnitureForModal()!}
          onUpdate={(updatedFurniture) => handleFurnitureUpdateInModal(updatedFurniture)}
        />
      )}

      {getFurnitureForModal() && project && (
        <FurnitureMaterialsModal
            isOpen={isMaterialsModalOpen}
            onClose={() => setMaterialsModalOpen(false)}
            furniture={getFurnitureForModal()!}
            onUpdate={handleFurnitureUpdateInModal}
            clientName={project.clientName}
        />
      )}
      
      {isEditModalOpen && (
        <RegisterProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          projectToEdit={project}
        />
      )}
    </>
  );
}
