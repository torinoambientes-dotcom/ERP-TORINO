'use client';

import { createContext, type ReactNode, useCallback, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Project, TeamMember, StageStatus } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';


interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  isLoading: boolean;
  addProject: (projectData: any) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  addTeamMember: (memberData: Omit<TeamMember, 'id'>) => void;
  completeProjectStages: (projectId: string) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  isLoading: true,
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  addTeamMember: () => {},
  completeProjectStages: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const teamMembersQuery = useMemoFirebase(() => collection(firestore, 'team_members'), [firestore]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useCollection<TeamMember>(teamMembersQuery);
  
  const addProject = useCallback((projectData: Omit<Project, 'id' | 'environments'> & { environments: Array<Omit<Project['environments'][0], 'id' | 'furniture'> & { furniture: Array<Omit<Project['environments'][0]['furniture'][0], 'id' | 'measurement' | 'cutting' | 'purchase' | 'assembly'>>}>}) => {
    if (!firestore) return;
    const projectId = generateId('proj');
    const newProject: Project = {
      ...projectData,
      id: projectId,
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
    const projectRef = doc(firestore, 'projects', projectId);
    setDocumentNonBlocking(projectRef, newProject, { merge: false });
  }, [firestore]);

  const updateProject = useCallback((updatedProject: Project) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', updatedProject.id);
    setDocumentNonBlocking(projectRef, updatedProject, { merge: true });
  }, [firestore]);

  const deleteProject = useCallback((projectId: string) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', projectId);
    deleteDocumentNonBlocking(projectRef);
  }, [firestore]);

  const addTeamMember = useCallback((memberData: Omit<TeamMember, 'id'>) => {
    if (!firestore) return;
    const memberId = generateId('member');
    const newMember = { ...memberData, id: memberId };
    const memberRef = doc(firestore, 'team_members', memberId);
    setDocumentNonBlocking(memberRef, newMember, { merge: false });
  }, [firestore]);
  
  const completeProjectStages = useCallback((projectId: string) => {
    if (!projects) return;

    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate) {
        const newEnvironments = projectToUpdate.environments.map((env) => ({
            ...env,
            furniture: env.furniture.map((fur) => ({
                ...fur,
                measurement: { ...fur.measurement, status: 'done' as StageStatus },
                cutting: { ...fur.cutting, status: 'done' as StageStatus },
                purchase: { ...fur.purchase, status: 'done' as StageStatus },
                assembly: { ...fur.assembly, status: 'done' as StageStatus },
            })),
        }));
        const updatedProject = { ...projectToUpdate, environments: newEnvironments };
        updateProject(updatedProject);
    }
  }, [projects, updateProject]);

  const value = useMemo(() => ({
    projects: projects || [],
    teamMembers: teamMembers || [],
    isLoading: isLoadingProjects || isLoadingTeamMembers,
    addProject,
    updateProject,
    deleteProject,
    addTeamMember,
    completeProjectStages,
  }), [projects, teamMembers, isLoadingProjects, isLoadingTeamMembers, addProject, updateProject, deleteProject, addTeamMember, completeProjectStages]);


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
