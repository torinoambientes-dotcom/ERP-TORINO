'use client';
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ChevronLeft, MessageSquare, Package, ListTodo, CalendarIcon, XCircle, Flag } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import type { Project, Furniture, StageStatus, TeamMember, ProductionStage, Priority } from '@/lib/types';
import { STAGE_STATUSES } from '@/lib/types';
import { FurniturePendenciesModal } from '@/components/modals/furniture-pendencies-modal';
import { FurnitureConversationModal } from '@/components/modals/furniture-conversation-modal';
import { FurnitureMaterialsModal } from '@/components/modals/furniture-materials-modal';
import { cn, getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDoorCreatorModal } from '@/components/modals/profile-door-creator-modal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

  const [isPendencyModalOpen, setPendencyModalOpen] = useState(false);
  const [isConversationModalOpen, setConversationModalOpen] = useState(false);
  const [isMaterialsModalOpen, setMaterialsModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);

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
    key: 'status' | 'responsibleId' | 'scheduledFor' | 'priority',
    value: string | Date | undefined | Priority
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
          
          if (key === 'responsibleId') {
            if (value === 'unassigned') {
              delete fur[stage].responsibleId;
            } else {
              fur[stage].responsibleId = value;
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

        const originalProject = JSON.parse(JSON.stringify(currentProject)); // Deep copy for comparison
        const newProject = JSON.parse(JSON.stringify(currentProject));
        
        const env = newProject.environments.find((e: any) => e.id === selectedEnvironmentId);

        if (env) {
            const furIndex = env.furniture.findIndex((f: any) => f.id === updatedFurniture.id);
            if (furIndex !== -1) {
                env.furniture[furIndex] = updatedFurniture;
                updateProject(newProject, originalProject);
                return newProject;
            }
        }
        return currentProject;
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
            <PageHeader
              title={project.clientName}
              description="Detalhes do projeto, ambientes e status das etapas."
            />
          </div>
        </div>

        <Accordion type="multiple" defaultValue={project.environments?.map(e => e.id) || []} className="w-full space-y-4">
          {project.environments?.map((env) => (
            <AccordionItem value={env.id} key={env.id} className="border-none rounded-xl bg-card overflow-hidden shadow-sm">
              <AccordionTrigger className="font-headline text-xl hover:no-underline px-6 py-4 bg-muted/50">
                {env.name}
              </AccordionTrigger>
              <AccordionContent className="p-6">
                <div className="space-y-4">
                  {env.furniture?.map((fur) => {
                    const unresolvedPendencies = fur.pendencies?.filter(p => !p.isResolved).length || 0;
                    const commentsCount = fur.comments?.length || 0;
                    return (
                    <div key={fur.id} className="p-4 rounded-lg border bg-background">
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
                          const responsibleMember = stageData.responsibleId ? memberMap.get(stageData.responsibleId) : undefined;
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
                              <Select
                                value={stageData.responsibleId || "unassigned"}
                                onValueChange={(value) =>
                                  handleStageChange(env.id, fur.id, stage.key, 'responsibleId', value)
                                }
                              >
                                <SelectTrigger>
                                    <div className="flex items-center gap-2 truncate">
                                      {responsibleMember ? (
                                        <>
                                          <Avatar className="h-6 w-6">
                                              {responsibleMember.avatarUrl && <AvatarImage src={responsibleMember.avatarUrl} alt={responsibleMember.name} />}
                                              <AvatarFallback style={{ backgroundColor: responsibleMember.color }} className='text-xs'>
                                              {getInitials(responsibleMember.name)}
                                              </AvatarFallback>
                                          </Avatar>
                                          <span className='truncate'>{responsibleMember.name}</span>
                                        </>
                                      ) : (
                                        <span className='text-muted-foreground'>Não atribuído</span>
                                      )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                                  <Separator />
                                  {responsibleList?.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                              {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                              <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>
                                              {getInitials(member.name)}
                                              </AvatarFallback>
                                          </Avatar>
                                        <span>{member.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

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
                  )})}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
    </>
  );
}
