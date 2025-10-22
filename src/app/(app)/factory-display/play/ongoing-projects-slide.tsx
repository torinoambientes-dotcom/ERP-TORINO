
'use client';
import { useContext, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import { getProjectStatus } from '@/lib/projects';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
        {ongoingProjects.length > 0 ? (
          ongoingProjects.map(({ project, statusInfo }) => (
            <div key={project.id} className="bg-gray-800 border-gray-700 text-white rounded-lg p-6 space-y-4 shadow-lg">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                    {project.clientName}
                    </h3>
                    <Badge variant="outline" className="text-blue-300 border-blue-400/50 bg-blue-900/30">
                        Em Andamento
                    </Badge>
                </div>
                <div className="space-y-2">
                    {statusInfo.totalTasks > 0 && (
                        <Progress value={statusInfo.progress} className="h-3 [&>div]:bg-blue-400" />
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-300">
                        <span>
                            {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas
                        </span>
                        <span className="font-semibold text-base text-gray-100">
                            {Math.round(statusInfo.progress)}%
                        </span>
                    </div>
                </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center h-full">
            <p className="text-xl text-gray-400">Nenhum projeto em andamento no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
