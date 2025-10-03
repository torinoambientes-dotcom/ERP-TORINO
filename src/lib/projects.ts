import type { Project } from '@/lib/types';

export type ProjectStatus = 'Novo' | 'Em Andamento' | 'Concluído';

export interface ProjectStatusInfo {
  status: ProjectStatus;
  progress: number;
  totalTasks: number;
  doneTasks: number;
  unresolvedPendencies: number;
  commentsCount: number;
}

export const getProjectStatus = (project: Project): ProjectStatusInfo => {
  let totalTasks = 0;
  let doneTasks = 0;
  let unresolvedPendencies = 0;
  let commentsCount = 0;
  
  if (project.environments) {
    project.environments.forEach((env) => {
      if (env.furniture) {
        env.furniture.forEach((fur) => {
          const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
          stages.forEach((stage) => {
            totalTasks++;
            if (fur[stage] && fur[stage].status === 'done') {
              doneTasks++;
            }
          });

          unresolvedPendencies += (fur.pendencies || []).filter(p => !p.isResolved).length;
          commentsCount += (fur.comments || []).length;
        });
      }
    });
  }

  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  
  let status: ProjectStatus = 'Novo';
  if (progress === 100) {
    status = 'Concluído';
  } else if (progress > 0 || doneTasks > 0) { // Considera "Em Andamento" se alguma tarefa começou
    status = 'Em Andamento';
  }
  
  return { status, progress, totalTasks, doneTasks, unresolvedPendencies, commentsCount };
};
