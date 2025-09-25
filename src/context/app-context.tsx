'use client';

import { createContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import type { Project, TeamMember } from '@/lib/types';
import { generateId } from '@/lib/utils';

// Helper for localStorage
const useStickyState = <T,>(defaultValue: T, key: string): [T, (value: T) => void] => {
  const [isMounted, setIsMounted] = useState(false);
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        const stickyValue = window.localStorage.getItem(key);
        if (stickyValue !== null) {
          setValue(JSON.parse(stickyValue));
        }
      } catch (e) {
        console.error(`Could not load state from localStorage for key "${key}"`, e);
      }
    }
  }, [isMounted, key]);

  useEffect(() => {
    if (isMounted) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Could not save state to localStorage for key "${key}"`, e);
      }
    }
  }, [key, value, isMounted]);

  const setStickyValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

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
    setProjects(prev => [...prev, newProject]);
  }, [setProjects]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prev => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
  }, [setProjects]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter((p) => p.id !== projectId));
  }, [setProjects]);

  const addTeamMember = useCallback((memberData: Omit<TeamMember, 'id'>) => {
    const newMember = { ...memberData, id: generateId('member') };
    setTeamMembers(prev => [...prev, newMember]);
  }, [setTeamMembers]);
  
  const completeProjectStages = useCallback((projectId: string) => {
    setProjects(
      prev => prev.map((p) => {
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
  }, [setProjects]);

  return (
    <AppContext.Provider value={{ projects, teamMembers, addProject, updateProject, deleteProject, addTeamMember, completeProjectStages }}>
      {children}
    </AppContext.Provider>
  );
}
