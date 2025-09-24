'use client';
import { useContext, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare, Save } from 'lucide-react';
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
import type { Project, Furniture, StageStatus, TeamMember } from '@/lib/types';
import { STAGE_STATUSES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FurnitureChatModal } from '@/components/modals/furniture-chat-modal';

type StageKey = 'measurement' | 'cutting' | 'purchase' | 'assembly';
const stages: { key: StageKey; label: string }[] = [
  { key: 'measurement', label: 'Medição' },
  { key: 'cutting', label: 'Plano de Corte' },
  { key: 'purchase', label: 'Compra Material' },
  { key: 'assembly', label: 'Pré Montagem' },
];

export default function ProjectDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { projects, teamMembers, updateProject } = useContext(AppContext);
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);

  useEffect(() => {
    const foundProject = projects.find((p) => p.id === params.id);
    if (foundProject) {
      setProject(JSON.parse(JSON.stringify(foundProject)));
    }
  }, [params.id, projects]);

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
        fur[stage].responsibleId = value;
        setProject(newProject);
      }
    }
  };

  const handleSaveChanges = () => {
    if (project) {
      updateProject(project);
      toast({
        title: 'Projeto salvo!',
        description: 'As alterações foram salvas com sucesso.',
      });
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
    const projectExists = projects.some((p) => p.id === params.id);
    if (!projectExists) {
      notFound();
    }
    return <div>Carregando...</div>;
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
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>

        <Accordion type="multiple" defaultValue={project.environments.map(e => e.id)} className="w-full">
          {project.environments.map((env) => (
            <AccordionItem value={env.id} key={env.id}>
              <AccordionTrigger className="font-headline text-xl">
                {env.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {env.furniture.map((fur) => (
                    <div key={fur.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-lg">{fur.name}</h4>
                        <Button variant="outline" size="sm" onClick={() => openChatModal(fur, env.id)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Pendências
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {stages.map((stage) => (
                          <div key={stage.key} className="space-y-2">
                            <label className="text-sm font-medium">{stage.label}</label>
                            <Select
                              value={fur[stage.key].status}
                              onValueChange={(value: StageStatus) =>
                                handleStatusChange(env.id, fur.id, stage.key, value)
                              }
                            >
                              <SelectTrigger>
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
                              value={fur[stage.key].responsibleId}
                              onValueChange={(value) =>
                                handleMemberChange(env.id, fur.id, stage.key, value)
                              }
                            >
                              <SelectTrigger>
                                  <div className="flex items-center gap-2">
                                    {fur[stage.key].responsibleId && memberMap.get(fur[stage.key].responsibleId) ? (
                                      <>
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: memberMap.get(fur[stage.key].responsibleId)?.color }}></span>
                                        <span>{memberMap.get(fur[stage.key].responsibleId)?.name}</span>
                                      </>
                                    ) : (
                                      <SelectValue placeholder="Responsável" />
                                    )}
                                  </div>
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: member.color }}></span>
                                      <span>{member.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                          </div>
                        ))}
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
