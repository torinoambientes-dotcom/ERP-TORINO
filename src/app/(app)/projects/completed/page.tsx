'use client';
import Link from 'next/link';
import { useContext, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trash2, CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeleteProjectAlert } from '@/components/modals/delete-project-alert';

const getProjectProgress = (project: Project) => {
  let totalTasks = 0;
  let doneTasks = 0;
  project.environments.forEach((env) => {
    env.furniture.forEach((fur) => {
      const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
      stages.forEach((stage) => {
        totalTasks++;
        if (fur[stage].status === 'done') {
          doneTasks++;
        }
      });
    });
  });

  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  return { progress, totalTasks, doneTasks };
};

export default function CompletedProjectsPage() {
  const { projects, deleteProject, isLoading } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const openDeleteModal = useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);
  
  const closeDeleteModal = useCallback(() => {
    setProjectToDelete(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  }, [projectToDelete, deleteProject]);

  const openDeleteModalWithPropagation = useCallback((e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      e.stopPropagation();
      openDeleteModal(project);
    },
    [openDeleteModal]
  );

  const completedProjects = useMemo(() => {
    if (!projects) return [];
    return projects
      .filter((project) => project.completedAt) // Apenas projetos com data de conclusão
      .map((project) => ({
        project,
        progressInfo: getProjectProgress(project),
      }))
      .filter(({ project }) => 
        project.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.project.completedAt!).getTime() - new Date(a.project.completedAt!).getTime());
  }, [projects, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando projetos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
          <div>
              <Button variant="ghost" asChild className="-ml-4">
                <Link href="/projects">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar para projetos ativos
                </Link>
              </Button>
              <PageHeader
                title="Projetos Concluídos"
                description="Histórico de todos os projetos finalizados."
              />
          </div>

        <Card>
          <CardContent className="p-4">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        {completedProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {completedProjects.map(({ project, progressInfo }) => {
              const { progress, totalTasks, doneTasks } = progressInfo;
              return (
                <div key={project.id} className="relative group">
                  <Link
                    href={`/projects/${project.id}`}
                    className="block h-full transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg rounded-lg"
                  >
                    <Card className="h-full cursor-pointer flex flex-col bg-card/80 backdrop-blur-sm border-border/80 shadow-sm">
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="font-headline text-xl tracking-tight text-foreground/90">
                            {project.clientName}
                          </CardTitle>
                          <Badge className="bg-green-600/20 text-green-700 border-green-600/30">
                            Concluído
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {project.environments.length} ambiente(s)
                        </p>
                        {project.deliveryDeadline && isValid(parseISO(project.deliveryDeadline)) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Prazo: {format(parseISO(project.deliveryDeadline), 'dd/MM/yyyy', {locale: ptBR})}</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {doneTasks} de {totalTasks} tarefas concluídas
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter className="flex-col items-start gap-1">
                        {project.completedAt && (
                          <p className="text-xs text-muted-foreground/80">
                            Finalizado em: {format(parseISO(project.completedAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70">
                          ID: {project.id}
                        </p>
                      </CardFooter>
                    </Card>
                  </Link>
                   <div className="absolute bottom-2 right-2 flex justify-end gap-1 bg-card/50 backdrop-blur-sm rounded-full p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive/80 hover:text-destructive h-8 w-8"
                            onClick={(e) => openDeleteModalWithPropagation(e, project)}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover Projeto</span>
                        </Button>
                    </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
            <div className="text-center">
              <h3 className="font-headline text-xl font-semibold text-muted-foreground/80">
                Nenhum projeto concluído encontrado
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Finalize as tarefas de um projeto para que ele apareça aqui.
              </p>
            </div>
          </div>
        )}
      </div>
      <DeleteProjectAlert
        isOpen={!!projectToDelete}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        projectName={projectToDelete?.clientName || ''}
      />
    </>
  );
}
