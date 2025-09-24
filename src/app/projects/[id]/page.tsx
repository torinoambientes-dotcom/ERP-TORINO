'use client';
import { useContext, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
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
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const { projects, teamMembers, updateProject } = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  const initialProject = useMemo(() => 
    projects.find((p) => p.id === params.id),
    [params.id, projects]
  );
  
  const [project, setProject] = useState<Project | null>(
    initialProject ? JSON.parse(JSON.stringify(initialProject)) : null
  );
  
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [selectedFurniture, setSelectedFurniture] = useState<Furniture | null>(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialProject) {
        notFound();
    }
  }, [initialProject]);

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
      router.push('/');
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
          <Button onClick={handleSaveChanges}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
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
                        {stages.map((stage) => (
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
                              value={fur[stage.key].responsibleId}
                              onValueChange={(value) =>
                                handleMemberChange(env.id, fur.id, stage.key, value)
                              }
                            >
                              <SelectTrigger>
                                  <div className="flex items-center gap-2">
                                    {fur[stage.key].responsibleId && memberMap.get(fur[stage.key].responsibleId) ? (
                                      <>
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage src={memberMap.get(fur[stage.key].responsibleId)?.avatarUrl} />
                                          <AvatarFallback>{memberMap.get(fur[stage.key].responsibleId)?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>{memberMap.get(fur[stage.key].responsibleId)?.name}</span>
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
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatarUrl} />
                                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
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
