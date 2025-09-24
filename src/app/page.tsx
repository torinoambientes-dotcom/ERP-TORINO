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
    if (totalTasks === 0) return { text: 'Novo', variant: 'secondary' as const };
    if (doneTasks === totalTasks) return { text: 'Concluído', variant: 'default' as const, className: 'bg-green-600' };
    if (doneTasks > 0) return { text: 'Em Andamento', variant: 'default' as const };
    return { text: 'Pendente', variant: 'secondary' as const };
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
             const status = getProjectStatus(project);
             return (
              <Link
                href={`/projects/${project.id}`}
                key={project.id}
                className="block h-full transition-all hover:scale-[1.02] hover:shadow-lg rounded-lg"
              >
                <Card className="h-full cursor-pointer flex flex-col">
                  <CardHeader>
                    <div className='flex justify-between items-start'>
                      <CardTitle className="font-headline text-lg tracking-tight">
                        {project.clientName}
                      </CardTitle>
                       <Badge variant={status.variant} className={status.className}>{status.text}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                      {project.environments.length} ambiente(s)
                    </p>
                  </CardContent>
                   <CardFooter>
                     <p className="text-xs text-muted-foreground">ID: {project.id}</p>
                   </CardFooter>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50">
          <div className="text-center">
            <h3 className="font-headline text-xl font-semibold text-muted-foreground">
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
