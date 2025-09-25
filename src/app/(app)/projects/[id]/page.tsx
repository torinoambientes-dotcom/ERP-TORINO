'use client';
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { ChevronLeft, MessageSquare, Package } from 'lucide-react';
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
import type { Project, Furniture, StageStatus } from '@/lib/types';
import { STAGE_STATUSES } from '@/lib/types';
import { FurnitureChatModal } from '@/components/modals/furniture-chat-modal';
import { FurnitureMaterialsModal } from '@/components/modals/furniture-materials-modal';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { deleteField } from 'firebase/firestore';

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

export default function ProjectDetailsPage() {
  const { projects, teamMembers, updateProject, isLoading } = useContext(AppContext);
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null | undefined>(undefined);

  const [isChatModalOpen, setChatModalOpen] = useState(false);
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
    key: 'status' | 'responsibleId',
    value: string
  ) => {
    setProject(currentProject => {
      if (!currentProject) return null;

      const newProject = JSON.parse(JSON.stringify(currentProject));
      const env = newProject.environments.find((e: any) => e.id === envId);
      if (env) {
        const fur = env.furniture.find((f: any) => f.id === furId);
        if (fur) {
          if (!fur[stage]) {
            fur[stage] = {};
          }
          if (key === 'responsibleId') {
            if (value === 'unassigned') {
              // Use delete operator to remove the field
              delete fur[stage].responsibleId;
            } else {
              fur[stage].responsibleId = value;
            }
          } else {
            fur[stage].status = value;
          }
        }
      }
      // Trigger update to Firestore non-blockingly
      updateProject(newProject);
      // Return the new state for immediate UI update
      return newProject;
    });
  }, [updateProject]);

  const handleFurnitureUpdateInModal = useCallback((updatedFurniture: Furniture) => {
    setProject(currentProject => {
        if (!currentProject || !selectedEnvironmentId) return currentProject;

        const newProject = JSON.parse(JSON.stringify(currentProject));
        const env = newProject.environments.find((e: any) => e.id === selectedEnvironmentId);

        if (env) {
            const furIndex = env.furniture.findIndex((f: any) => f.id === updatedFurniture.id);
            if (furIndex !== -1) {
                env.furniture[furIndex] = updatedFurniture;
                updateProject(newProject);
                return newProject;
            }
        }
        return currentProject;
    });
  }, [selectedEnvironmentId, updateProject]);

  const openChatModal = useCallback((furniture: Furniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setChatModalOpen(true);
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
              <Link href="/">
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

        <Accordion type="multiple" defaultValue={project.environments?.map(e => e.id) || []} className="w-full">
          {project.environments?.map((env) => (
            <AccordionItem value={env.id} key={env.id}>
              <AccordionTrigger className="font-headline text-xl hover:no-underline">
                {env.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {env.furniture?.map((fur) => {
                    const unresolvedPendencies = fur.pendencies?.filter(p => !p.isResolved).length || 0;
                    return (
                    <div key={fur.id} className="p-4 rounded-lg border bg-card/80">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h4 className="font-semibold text-lg">{fur.name}</h4>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" size="sm" onClick={() => openMaterialsModal(fur, env.id)} className="w-full sm:w-auto flex-1">
                                <Package className="mr-2 h-4 w-4" />
                                Materiais
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openChatModal(fur, env.id)} className="w-full sm:w-auto relative flex-1">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Pendências
                                {unresolvedPendencies > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                                    {unresolvedPendencies}
                                    </span>
                                )}
                            </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stages.map((stage) => {
                          const stageData = fur[stage.key] || { status: 'todo' };
                          const responsibleMember = stageData.responsibleId ? memberMap.get(stageData.responsibleId) : undefined;
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
                                        <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: responsibleMember.color }}></span>
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
                                {teamMembers?.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: member.color }}></span>
                                      <span>{member.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
        <FurnitureChatModal
          isOpen={isChatModalOpen}
          onClose={() => setChatModalOpen(false)}
          furniture={getFurnitureForModal()!}
          onUpdate={handleFurnitureUpdateInModal}
        />
      )}

      {getFurnitureForModal() && (
        <FurnitureMaterialsModal
            isOpen={isMaterialsModalOpen}
            onClose={() => setMaterialsModalOpen(false)}
            furniture={getFurnitureForModal()!}
            onUpdate={handleFurnitureUpdateInModal}
        />
      )}
    </>
  );
}

    