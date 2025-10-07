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
import { Archive, CheckCircle, Pencil, Trash2, ListTodo, MessageSquare } from 'lucide-react';
import { DeleteProjectAlert } from '@/components/modals/delete-project-alert';
import { RegisterProjectModal } from '@/components/modals/register-project-modal';
import { getProjectStatus } from '@/lib/projects';

type ProjectStatus = 'Novo' | 'Em Andamento' | 'Concluído';

export default function ProjectsPage() {
  const { projects, deleteProject, completeProjectStages, isLoading } = useContext(AppContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
  
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value as ProjectStatus | 'Todos');
  }, []);

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

  const handleCompleteClick = useCallback((e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    completeProjectStages(projectId);
  }, [completeProjectStages]);

  const openEditModal = useCallback((e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setProjectToEdit(null);
    setIsEditModalOpen(false);
  }, []);

  const openDeleteModalWithPropagation = useCallback((e: React.MouseEvent, project: Project) => {
      e.preventDefault();
      e.stopPropagation();
      openDeleteModal(project);
    },
    [openDeleteModal]
  );

  const filteredProjects = useMemo(() => {
     if (!projects) return [];
     return projects
      .map((project) => ({
        project,
        statusInfo: getProjectStatus(project),
      }))
      .filter(({ project, statusInfo }) => {
        // Exclui projetos concluídos da lista de projetos ativos
        if (project.completedAt) return false;

        const matchesSearch = project.clientName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === 'Todos' || statusInfo.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [projects, searchTerm, statusFilter]);

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Projetos Ativos"
            description="Visualize e gerencie os projetos em andamento."
          />
          <Button asChild variant="outline" className="w-full sm:w-auto">
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
            {filteredProjects.map(({ project, statusInfo }) => {
                let statusBadge: { variant: 'default' | 'secondary' | 'outline', className?: string };
                switch (statusInfo.status) {
                    case 'Concluído':
                        statusBadge = { variant: 'default', className: 'bg-green-600/20 text-green-700 border-green-600/30' };
                        break;
                    case 'Em Andamento':
                        statusBadge = { variant: 'outline', className: 'text-blue-700 border-blue-600/30 bg-blue-600/10' };
                        break;
                    default:
                        statusBadge = { variant: 'secondary' };
                        break;
                }

              return (
                <div key={project.id} className="relative group">
                  <Link href={`/projects/${project.id}`} className="block h-full">
                    <Card className="h-full flex flex-col bg-card/80 backdrop-blur-sm border-border/80 shadow-sm transition-all duration-300 ease-in-out group-hover:shadow-lg">
                      <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                          <CardTitle className="font-headline text-xl tracking-tight text-foreground/90">
                          {project.clientName}
                          </CardTitle>
                          <Badge variant={statusBadge.variant} className={statusBadge.className}>
                          {statusInfo.status}
                          </Badge>
                      </div>
                      </CardHeader>
                      <CardContent className="flex-grow space-y-4">
                      <p className="text-sm text-muted-foreground">
                          {project.environments?.length || 0} ambiente(s)
                      </p>
                      {statusInfo.totalTasks > 0 && (
                          <div className="space-y-2">
                              <Progress value={statusInfo.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                              {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas concluídas
                              </p>
                          </div>
                      )}
                      </CardContent>
                      <CardFooter>
                        <div className="flex items-center gap-2">
                            {statusInfo.unresolvedPendencies > 0 && (
                                <div className="relative">
                                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="destructive" className="absolute -top-2 -right-3 h-4 w-4 justify-center rounded-full p-0 text-xs">{statusInfo.unresolvedPendencies}</Badge>
                                </div>
                            )}
                             {statusInfo.commentsCount > 0 && (
                                <div className="relative">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 absolute -top-2 -right-3 h-4 w-4 justify-center rounded-full p-0 text-xs">{statusInfo.commentsCount}</Badge>
                                </div>
                            )}
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                  <div className="absolute bottom-2 right-2 flex justify-end gap-1 bg-card/50 backdrop-blur-sm rounded-full p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openEditModal(e, project)}
                          className="text-muted-foreground hover:text-primary h-8 w-8"
                      >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar Projeto</span>
                      </Button>
                      <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleCompleteClick(e, project.id)}
                          className="text-muted-foreground hover:text-green-600 h-8 w-8"
                      >
                          <CheckCircle className="h-4 w-4" />
                          <span className="sr-only">Concluir</span>
                      </Button>
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
            <div className="text-center p-4">
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
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        projectName={projectToDelete?.clientName || ''}
      />
      
      {isEditModalOpen && (
        <RegisterProjectModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          projectToEdit={projectToEdit}
        />
      )}
    </>
  );
}
