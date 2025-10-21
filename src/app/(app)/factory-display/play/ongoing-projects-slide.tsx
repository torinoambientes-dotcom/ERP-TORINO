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
  
  const animationDuration = useMemo(() => {
    // Adjust speed based on number of projects. 5 seconds per project.
    const duration = ongoingProjects.length * 5;
    return Math.max(duration, 20); // Minimum duration of 20 seconds
  }, [ongoingProjects.length]);


  return (
    <div className="h-full flex flex-col justify-center items-center">
      <h2 className="text-4xl font-bold text-center mb-8">Projetos em Andamento</h2>
      
      <div 
        className="w-full h-[75vh] px-4 overflow-hidden relative"
        style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)',
        }}
      >
        {ongoingProjects.length > 0 ? (
          <div 
            className="animate-scroll-vertical"
            data-ai-hint="This div uses a CSS animation to create a seamless vertical scroll effect for the list of projects."
            style={{ animationDuration: `${animationDuration}s` }}
          >
             {/* Duplicate the list for seamless scrolling */}
            <div className="flex flex-col gap-6">
              {ongoingProjects.map(({ project, statusInfo }) => (
                <div key={`${project.id}-1`} className="bg-gray-800 border-gray-700 text-white rounded-lg p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center">
                      <h3 className="text-4xl font-bold tracking-tight">
                        {project.clientName}
                      </h3>
                      <div className="flex items-center gap-4 text-lg">
                          <Badge variant="outline" className="text-blue-300 border-blue-400/50 bg-blue-900/30 text-base">
                              Em Andamento
                          </Badge>
                          <span className="text-gray-300">
                              {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas
                          </span>
                          <span className="font-semibold text-2xl text-gray-100">
                              {Math.round(statusInfo.progress)}%
                          </span>
                      </div>
                  </div>
                  {statusInfo.totalTasks > 0 && (
                      <Progress value={statusInfo.progress} className="h-4 [&>div]:bg-blue-400" />
                  )}
                </div>
              ))}
            </div>
             <div className="flex flex-col gap-6 mt-6">
              {ongoingProjects.map(({ project, statusInfo }) => (
                <div key={`${project.id}-2`} className="bg-gray-800 border-gray-700 text-white rounded-lg p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center">
                      <h3 className="text-4xl font-bold tracking-tight">
                        {project.clientName}
                      </h3>
                      <div className="flex items-center gap-4 text-lg">
                          <Badge variant="outline" className="text-blue-300 border-blue-400/50 bg-blue-900/30 text-base">
                              Em Andamento
                          </Badge>
                          <span className="text-gray-300">
                              {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas
                          </span>
                          <span className="font-semibold text-2xl text-gray-100">
                              {Math.round(statusInfo.progress)}%
                          </span>
                      </div>
                  </div>
                  {statusInfo.totalTasks > 0 && (
                      <Progress value={statusInfo.progress} className="h-4 [&>div]:bg-blue-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="col-span-full flex items-center justify-center h-full">
            <p className="text-xl text-gray-400">Nenhum projeto em andamento no momento.</p>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes scroll-vertical {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-50%);
          }
        }
        .animate-scroll-vertical {
          animation: scroll-vertical linear infinite;
          padding-bottom: 2rem; /* Add some space at the end of the duplicated list */
        }
      `}</style>
    </div>
  );
}
