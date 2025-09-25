'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Project, TeamMember } from '@/lib/types';
import { initialProjects, initialTeamMembers } from '@/lib/data';

interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  addProject: (project: Project) => void;
  addTeamMember: (member: TeamMember) => void;
  updateProject: (updatedProject: Project) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  addProject: () => {},
  addTeamMember: () => {},
  updateProject: () => {},
});

const useStickyState = <T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null
      ? JSON.parse(stickyValue)
      : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useStickyState<Project[]>(initialProjects, 'app-projects');
  const [teamMembers, setTeamMembers] = useStickyState<TeamMember[]>(initialTeamMembers, 'app-team-members');

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

  const value = {
    projects,
    teamMembers,
    addProject,
    addTeamMember,
    updateProject,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
