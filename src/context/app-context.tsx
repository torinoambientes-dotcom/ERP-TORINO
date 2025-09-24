'use client';

import { createContext, useState, type ReactNode } from 'react';
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);

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
