'use client';
import { useContext, useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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

export default function ProjectDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const resolvedParams = use(params);
  const { projects, teamMembers, updateProject } = useContext(AppContext);
  const { id } = resolvedParams;

  const initialProject = useMemo(() => 
    projects.find((p) => p.id === id),
    [id, projects]
  );
  
  const [project, setProject] = useState<Project | undefined>(
    initialProject ? JSON.parse(JSON.stringify(initialProject)) : undefined
  );
  
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialProject) {
        notFound();
    }
    setProject(initialProject ? JSON.parse(JSON.stringify(initialProject)) : undefined);
  }, [initialProject]);
  
  // Auto-save with debounce
  useEffect(() => {
    if (project && initialProject && JSON.stringify(project) !== JSON.stringify(initialProject)) {
      const handler = setTimeout(() => {
        updateProject(project);
      }, 1000); // 1-second debounce

      return () => {
        clearTimeout(handler);
      };
    }
  }, [project, initialProject, updateProject]);


  const handleStatusChange = (
    envId: string,
    furId: string,
    stage: StageKey,
    value: StageStatus
  ) => {
    if (!project) return;
    const newProject = { ...project };
    const env = newProject.environments.find((e) => e.id === envId);
    if (env) {
      const fur = env.furniture.find((f) => f.id === furId);
      if (fur) {
        fur[stage].status = value;
        setProject(newProject);
      }
    }
  };

  const handleMemberChange = (
    envId: string,
    furId: string,
    stage: StageKey,
    value: string
  ) => {
    if (!project) return;
    const newProject = { ...project };
    const env = newProject.environments.find((e) => e.id === envId);
    if (env) {
      const fur = env.furniture.find((f) => f.id === furId);
      if (fur) {
        fur[stage].responsibleId = value === 'unassigned' ? undefined : value;
        setProject(newProject);
      }
    }
  };

  const openChatModal = (furniture: Furniture, envId: string) => {
    setSelectedFurniture(furniture);
    setSelectedEnvironmentId(envId);
    setChatModalOpen(true);
  };
  
  const memberMap = useMemo(() => {
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);


  if (!project) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando projeto...</p>
      </div>
    );
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

        <Accordion type="multiple" defaultValue={project.environments.map(e => e.id)} className="w-full">
          {project.environments.map((env) => (
            <AccordionItem value={env.id} key={env.id}>
              <AccordionTrigger className="font-headline text-xl hover:no-underline">
                {env.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {env.furniture.map((fur) => (
                    <div key={fur.id} className="p-4 rounded-lg border bg-card/80">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">{fur.name}</h4>
                        <Button variant="outline" size="sm" onClick={() => openChatModal(fur, env.id)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Pendências
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stages.map((stage) => {
                          const responsibleMember = fur[stage.key].responsibleId ? memberMap.get(fur[stage.key].responsibleId) : undefined;
                          return (
                          <div key={stage.key} className="space-y-2">
                            <label className="text-sm font-medium">{stage.label}</label>
                            <Select
                              value={fur[stage.key].status}
                              onValueChange={(value: StageStatus) =>
                                handleStatusChange(env.id, fur.id, stage.key, value)
                              }
                            >
                              <SelectTrigger className={cn("font-semibold", statusColors[fur[stage.key].status])}>
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
                              value={fur[stage.key].responsibleId || "unassigned"}
                              onValueChange={(value) =>
                                handleMemberChange(env.id, fur.id, stage.key, value)
                              }
                            >
                              <SelectTrigger>
                                  <div className="flex items-center gap-2">
                                    {responsibleMember ? (
                                      <>
                                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: responsibleMember.color }}></span>
                                        <span>{responsibleMember.name}</span>
                                      </>
                                    ) : (
                                      <SelectValue placeholder="Responsável" />
                                    )}
                                  </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Não atribuído</SelectItem>
                                <Separator />
                                {teamMembers.map((member) => (
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
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

       {selectedFurniture && selectedEnvironmentId && (
        <FurnitureChatModal
          isOpen={isChatModalOpen}
          onClose={() => setChatModalOpen(false)}
          furniture={selectedFurniture}
          environmentId={selectedEnvironmentId}
          project={project}
          setProject={setProject}
        />
      )}
    </>
  );
}
