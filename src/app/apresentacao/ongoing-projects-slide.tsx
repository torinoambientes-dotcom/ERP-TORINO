
'use client';
import { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { getProjectStatus } from '@/lib/projects';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function OngoingProjectsSlide() {
  const { projects } = useContext(AppContext);
  const [isAnimating, setIsAnimating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const listInnerRef = useRef<HTMLDivElement>(null);


  const ongoingProjects = useMemo(() => {
    return (projects || [])
      .map(project => ({
        project,
        statusInfo: getProjectStatus(project),
      }))
      .filter(({ statusInfo }) => statusInfo.status === 'Em Andamento')
      .sort((a, b) => b.statusInfo.progress - a.statusInfo.progress);
  }, [projects]);
  
  // Duplicar a lista para criar o efeito de scroll infinito
  const duplicatedProjects = useMemo(() => [...ongoingProjects, ...ongoingProjects], [ongoingProjects]);

  useEffect(() => {
    if (listRef.current && listInnerRef.current) {
        const listHeight = listRef.current.clientHeight;
        const listInnerHeight = listInnerRef.current.clientHeight;
        // Começa a animação apenas se o conteúdo for maior que o contentor
        setIsAnimating(listInnerHeight > listHeight && ongoingProjects.length > 0);
    }
  }, [ongoingProjects.length, duplicatedProjects.length]);


  return (
    <div className="h-full flex flex-col p-4">
      <style>{`
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
        }
      `}</style>

      <h2 className="text-4xl font-bold text-center mb-8 flex-shrink-0">Projetos em Andamento</h2>
      
      <div ref={listRef} className="w-full max-w-4xl mx-auto overflow-hidden flex-grow min-h-0">
        {ongoingProjects.length > 0 ? (
          <div 
            ref={listInnerRef}
            className={cn('flex flex-col gap-6', isAnimating && 'animate-scroll-vertical')}
            style={ isAnimating ? { animationDuration: `${ongoingProjects.length * 5}s` } : {}}
          >
            {duplicatedProjects.map(({ project, statusInfo }, index) => (
              <div key={`${project.id}-${index}`} className="bg-gray-800 border-gray-700 text-white rounded-lg p-6 space-y-4 shadow-lg">
                  <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-bold tracking-tight">
                      {project.clientName}
                      </h3>
                      <Badge variant="outline" className="text-xl text-blue-300 border-blue-400/50 bg-blue-900/30">
                          Em Andamento
                      </Badge>
                  </div>
                  <div className="space-y-2">
                      {statusInfo.totalTasks > 0 && (
                          <Progress value={statusInfo.progress} className="h-4 [&>div]:bg-blue-400" />
                      )}
                      <div className="flex justify-between items-center text-lg text-gray-300">
                          <span>
                              {statusInfo.doneTasks} de {statusInfo.totalTasks} tarefas
                          </span>
                          <span className="font-semibold text-xl text-gray-100">
                              {Math.round(statusInfo.progress)}%
                          </span>
                      </div>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-full flex items-center justify-center h-full">
            <p className="text-xl text-gray-400">Nenhum projeto em andamento no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

