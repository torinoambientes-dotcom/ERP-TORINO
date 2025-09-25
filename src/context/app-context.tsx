'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Project, TeamMember } from '@/lib/types';

interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  addProject: (project: Project) => void;
  addTeamMember: (member: TeamMember) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  completeProjectStages: (projectId: string) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  addProject: () => {},
  addTeamMember: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  completeProjectStages: () => {},
});

const useStickyState = <T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null
        ? JSON.parse(stickyValue)
        : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useStickyState<Project[]>([], 'app-projects');
  const [teamMembers, setTeamMembers] = useStickyState<TeamMember[]>([], 'app-team-members');

  const addProject = (project: Project) => {
    setProjects((prev) => [...prev, project]);
  };

  const addTeamMember = (member: TeamMember) => {
    setTeamMembers((prev) => [...prev, member]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  };
  
  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const completeProjectStages = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const newEnvironments = p.environments.map((env) => ({
            ...env,
            furniture: env.furniture.map((fur) => ({
              ...fur,
              measurement: { ...fur.measurement, status: 'done' as const },
              cutting: { ...fur.cutting, status: 'done' as const },
              purchase: { ...fur.purchase, status: 'done' as const },
              assembly: { ...fur.assembly, status: 'done' as const },
            })),
          }));
          return { ...p, environments: newEnvironments };
        }
        return p;
      })
    );
  };


  const value = {
    projects,
    teamMembers,
    addProject,
    addTeamMember,
    updateProject,
    deleteProject,
    completeProjectStages,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
