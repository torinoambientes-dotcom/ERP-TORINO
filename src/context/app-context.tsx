'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Project, TeamMember, Environment, Furniture } from '@/lib/types';
import { generateId } from '@/lib/utils';

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
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const stickyValue = window.localStorage.getItem(key);
    if (stickyValue !== null) {
      try {
        setValue(JSON.parse(stickyValue));
      } catch (error) {
        console.warn(`Error parsing localStorage key “${key}”:`, error);
        setValue(defaultValue);
      }
    }
  }, [key, defaultValue]);

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
    // When updating, check for new environments or furniture that don't have IDs or default stages
    const processedProject = {
      ...updatedProject,
      environments: updatedProject.environments.map((env: Partial<Environment>) => ({
        ...env,
        id: env.id || generateId('env'),
        name: env.name || '',
        furniture: (env.furniture || []).map((fur: Partial<Furniture>) => ({
          ...fur,
          id: fur.id || generateId('fur'),
          name: fur.name || '',
          measurement: fur.measurement || { status: 'todo' },
          cutting: fur.cutting || { status: 'todo' },
          purchase: fur.purchase || { status: 'todo' },
          assembly: fur.assembly || { status: 'todo' },
          comments: fur.comments || [],
          pendencies: fur.pendencies || [],
        })),
      })),
    };
    
    setProjects((prev) =>
      prev.map((p) => (p.id === processedProject.id ? processedProject : p))
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
