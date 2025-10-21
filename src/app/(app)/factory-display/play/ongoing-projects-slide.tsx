'use client';
import { useContext, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import { getProjectStatus } from '@/lib/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

export function OngoingProjectsSlide() {
  const { projects } = useContext(AppContext);

  const ongoingProjects = useMemo(() => {
    return (projects || [])
      .map(project => ({
        project,
        statusInfo: getProjectStatus(project),
      }))
      .filter(({ statusInfo }) => statusInfo.status === 'Em Andamento')
      .sort((a, b) => b.statusInfo.progress - a.statusInfo.progress);
  }, [projects]);

  return (
    <div className="h-full flex flex-col justify-center items-center">
      <h2 className="text-4xl font-bold text-center mb-8">Projetos em Andamento</h2>
      <ScrollArea className="w-full h-[75vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-1">
          {ongoingProjects.length > 0 ? (
            ongoingProjects.map(({ project, statusInfo }) => (
              <Card key={project.id} className="bg-gray-800 border-gray-700 text-white flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                      {project.clientName}
                    </CardTitle>
                    <Badge variant="outline" className="text-blue-300 border-blue-400/50 bg-blue-900/30">
                        Em Andamento
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                   <p className="text-base text-gray-400">
                      {project.environments?.length || 0} ambiente(s)
                    </p>
                    {statusInfo.totalTasks > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-base text-gray-300">
                            <span>
                                {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas concluídas
                            </span>
                             <span className="font-semibold text-gray-100">
                                {Math.round(statusInfo.progress)}%
                              </span>
                          </div>
                          <Progress value={statusInfo.progress} className="h-3 [&>div]:bg-blue-400" />
                        </div>
                    )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center h-64">
              <p className="text-xl text-gray-400">Nenhum projeto em andamento no momento.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
