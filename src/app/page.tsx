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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Archive, CheckCircle, Trash2 } from 'lucide-react';
import { DeleteProjectAlert } from '@/components/modals/delete-project-alert';

type ProjectStatus = 'Novo' | 'Em Andamento' | 'Concluído';

const getProjectStatus = (project: Project) => {
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
  let status: {
    text: ProjectStatus;
    variant: 'default' | 'secondary' | 'outline';
    className?: string;
  };

  if (progress === 100) {
    status = {
      text: 'Concluído',
      variant: 'default',
      className: 'bg-green-600/20 text-green-700 border-green-600/30',
    };
  } else if (progress > 0) {
    status = {
      text: 'Em Andamento',
      variant: 'outline',
      className: 'text-blue-700 border-blue-600/30 bg-blue-600/10',
    };
  } else {
    status = { text: 'Novo', variant: 'secondary' };
  }

  return { status, progress, totalTasks, doneTasks };
};

export default function ProjectsPage() {
  const { projects, deleteProject, completeProjectStages } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value as ProjectStatus | 'Todos');
  }, []);

  const handleDeleteClick = useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  }, [projectToDelete, deleteProject]);

  const handleCompleteClick = useCallback((projectId: string) => {
    completeProjectStages(projectId);
  }, [completeProjectStages]);

  const filteredProjects = projects
    .map((project) => ({
      ...project,
      statusInfo: getProjectStatus(project),
    }))
    .filter((project) => {
      const isCompleted = project.statusInfo.status.text === 'Concluído';
      if (isCompleted) return false;

      const matchesSearch = project.clientName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'Todos' || project.statusInfo.status.text === statusFilter;
      return matchesSearch && matchesStatus;
    });

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Projetos Ativos"
            description="Visualize e gerencie os projetos em andamento."
          />
          <Button asChild variant="outline">
            <Link href="/projects/completed">
              <Archive className="mr-2 h-4 w-4" />
              Ver Concluídos
            </Link>
          </Button>
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
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => {
              const { status, progress, totalTasks, doneTasks } = project.statusInfo;
              return (
                <Card key={project.id} className="h-full flex flex-col bg-card/80 backdrop-blur-sm border-border/80 shadow-sm transition-all duration-300 ease-in-out hover:shadow-lg">
                  <Link href={`/projects/${project.id}`} className="block flex-grow">
                    <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="font-headline text-xl tracking-tight text-foreground/90">
                          {project.clientName}
                        </CardTitle>
                        <Badge variant={status.variant} className={status.className}>
                          {status.text}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {project.environments.length} ambiente(s)
                      </p>
                       {totalTasks > 0 && (
                        <div className="space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                            {doneTasks} de {totalTasks} tarefas concluídas
                            </p>
                        </div>
                        )}
                    </CardContent>
                  </Link>
                  <CardFooter className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCompleteClick(project.id)}
                      className="text-xs"
                    >
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                      Concluir Etapas
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive/80 hover:text-destructive"
                      onClick={() => handleDeleteClick(project)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover Projeto</span>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
            <div className="text-center">
              <h3 className="font-headline text-xl font-semibold text-muted-foreground/80">
                Nenhum projeto ativo encontrado
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cadastre um novo projeto ou verifique os projetos concluídos.
              </p>
            </div>
          </div>
        )}
      </div>
      <DeleteProjectAlert
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteConfirm}
        projectName={projectToDelete?.clientName || ''}
      />
    </>
  );
}
