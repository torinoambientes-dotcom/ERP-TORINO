'use client';

import { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { Project, TeamMember } from '@/lib/types';
import { generateId } from '@/lib/utils';

// Helper for localStorage
const useStickyState = <T,>(defaultValue: T, key: string): [T, (value: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  
  const setStickyValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, [key]);

  return [value, setStickyValue];
};


interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  addProject: (projectData: Omit<Project, 'id' | 'environments'> & { environments: Array<Omit<Project['environments'][0], 'id' | 'furniture'> & { furniture: Array<Omit<Project['environments'][0]['furniture'][0], 'id' | 'measurement' | 'cutting' | 'purchase' | 'assembly'>>}>}) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  addTeamMember: (memberData: Omit<TeamMember, 'id'>) => void;
  completeProjectStages: (projectId: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useStickyState<Project[]>([], 'app-projects');
  const [teamMembers, setTeamMembers] = useStickyState<TeamMember[]>([], 'app-team-members');

  const addProject = useCallback((projectData: Omit<Project, 'id' | 'environments'> & { environments: Array<Omit<Project['environments'][0], 'id' | 'furniture'> & { furniture: Array<Omit<Project['environments'][0]['furniture'][0], 'id' | 'measurement' | 'cutting' | 'purchase' | 'assembly'>>}>}) => {
    const newProject: Project = {
      ...projectData,
      id: generateId('proj'),
      environments: projectData.environments.map((env) => ({
        ...env,
        id: generateId('env'),
        furniture: env.furniture.map((fur) => ({
          ...fur,
          id: generateId('fur'),
          measurement: { status: 'todo' },
          cutting: { status: 'todo' },
          purchase: { status: 'todo' },
          assembly: { status: 'todo' },
          comments: [],
          pendencies: [],
        })),
      })),
    };
    setProjects([...projects, newProject]);
  }, [projects, setProjects]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  }, [projects, setProjects]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId));
  }, [projects, setProjects]);

  const addTeamMember = useCallback((memberData: Omit<TeamMember, 'id'>) => {
    const newMember = { ...memberData, id: generateId('member') };
    setTeamMembers([...teamMembers, newMember]);
  }, [teamMembers, setTeamMembers]);
  
  const completeProjectStages = useCallback((projectId: string) => {
    setProjects(
      projects.map((p) => {
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
  }, [projects, setProjects]);

  return (
    <AppContext.Provider value={{ projects, teamMembers, addProject, updateProject, deleteProject, addTeamMember, completeProjectStages }}>
      {children}
    </AppContext.Provider>
  );
}
