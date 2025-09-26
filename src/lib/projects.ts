import type { Project } from '@/lib/types';

export type ProjectStatus = 'Novo' | 'Em Andamento' | 'Concluído';

export interface ProjectStatusInfo {
  status: ProjectStatus;
  progress: number;
  totalTasks: number;
  doneTasks: number;
}

export const getProjectStatus = (project: Project): ProjectStatusInfo => {
  let totalTasks = 0;
  let doneTasks = 0;
  
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
        });
      }
    });
  }

  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  
  if (progress === 100) return { status: 'Concluído', progress, totalTasks, doneTasks };
  if (progress > 0) return { status: 'Em Andamento', progress, totalTasks, doneTasks };
  return { status: 'Novo', progress, totalTasks, doneTasks };
};
