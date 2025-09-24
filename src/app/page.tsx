'use client';
import Link from 'next/link';
import { useContext } from 'react';
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

export default function ProjectsPage() {
  const { projects } = useContext(AppContext);

  const getProjectStatus = (project: (typeof projects)[0]) => {
    let totalTasks = 0;
    let doneTasks = 0;
    project.environments.forEach((env) => {
      env.furniture.forEach((fur) => {
        const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
        stages.forEach(stage => {
            totalTasks++;
            if (fur[stage].status === 'done') {
                doneTasks++;
            }
        });
      });
    });

    const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    let status: { text: string; variant: 'default' | 'secondary' | 'outline', className?: string };

    if (progress === 100) {
      status = { text: 'Concluído', variant: 'default', className: 'bg-green-600/20 text-green-700 border-green-600/30' };
    } else if (progress > 0) {
      status = { text: 'Em Andamento', variant: 'outline', className: 'text-blue-700 border-blue-600/30 bg-blue-600/10' };
    } else {
      status = { text: 'Novo', variant: 'secondary' };
    }
    
    return { status, progress, totalTasks, doneTasks };
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Projetos"
        description="Visualize e gerencie todos os seus projetos."
      />
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => {
             const { status, progress, totalTasks, doneTasks } = getProjectStatus(project);
             return (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="block h-full transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg rounded-lg"
              >
                <Card className="h-full cursor-pointer flex flex-col bg-card/80 backdrop-blur-sm border-border/80 shadow-sm">
                  <CardHeader>
                    <div className='flex justify-between items-start gap-2'>
                      <CardTitle className="font-headline text-xl tracking-tight text-foreground/90">
                        {project.clientName}
                      </CardTitle>
                       <Badge variant={status.variant} className={status.className}>{status.text}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {project.environments.length} ambiente(s)
                    </p>
                    <div className="space-y-2">
                        <Progress value={progress} className="h-2 bg-muted" />
                        <p className="text-xs text-muted-foreground">{doneTasks} de {totalTasks} tarefas concluídas</p>
                    </div>
                  </CardContent>
                   <CardFooter>
                     <p className="text-xs text-muted-foreground/70">ID: {project.id}</p>
                   </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <div className="text-center">
            <h3 className="font-headline text-xl font-semibold text-muted-foreground/80">
              Nenhum projeto cadastrado
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre um novo projeto na barra lateral.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
