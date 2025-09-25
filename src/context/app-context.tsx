'use client';

import { createContext, type ReactNode, useCallback, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Project, TeamMember, StageStatus, StockItem } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';


interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  stockItems: StockItem[];
  isLoading: boolean;
  addProject: (projectData: any) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  addTeamMember: (memberData: Omit<TeamMember, 'id'>) => void;
  updateTeamMember: (updatedMember: TeamMember) => void;
  deleteTeamMember: (memberId: string) => void;
  completeProjectStages: (projectId: string) => void;
  addStockItem: (itemData: Omit<StockItem, 'id'>) => void;
  updateStockItem: (updatedItem: StockItem) => void;
  deleteStockItem: (itemId: string) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  stockItems: [],
  isLoading: true,
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  addTeamMember: () => {},
  updateTeamMember: () => {},
  deleteTeamMember: () => {},
  completeProjectStages: () => {},
  addStockItem: () => {},
  updateStockItem: () => {},
  deleteStockItem: () => {},
});

const isProjectComplete = (project: Project): boolean => {
  if (!project.environments || project.environments.length === 0) {
    return false; // Ou true, dependendo da regra de negócio para projetos vazios
  }

  return project.environments.every(env =>
    env.furniture.every(fur =>
      fur.measurement.status === 'done' &&
      fur.cutting.status === 'done' &&
      fur.purchase.status === 'done' &&
      fur.assembly.status === 'done'
    )
  );
};


export function AppProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const teamMembersQuery = useMemoFirebase(() => collection(firestore, 'team_members'), [firestore]);
  const stockItemsQuery = useMemoFirebase(() => collection(firestore, 'stock_items'), [firestore]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useCollection<TeamMember>(teamMembersQuery);
  const { data: stockItems, isLoading: isLoadingStockItems } = useCollection<StockItem>(stockItemsQuery);
  
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
    
    const projectWithCompletion = { ...updatedProject };
    
    // Verifica se o projeto está sendo concluído e ainda não tem data de conclusão
    if (isProjectComplete(projectWithCompletion) && !projectWithCompletion.completedAt) {
      projectWithCompletion.completedAt = new Date().toISOString();
    }
    
    const projectRef = doc(firestore, 'projects', projectWithCompletion.id);
    setDocumentNonBlocking(projectRef, projectWithCompletion, { merge: true });
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

  const updateTeamMember = useCallback((updatedMember: TeamMember) => {
    if (!firestore) return;
    const memberRef = doc(firestore, 'team_members', updatedMember.id);
    setDocumentNonBlocking(memberRef, updatedMember, { merge: true });
  }, [firestore]);

  const deleteTeamMember = useCallback((memberId: string) => {
    if (!firestore) return;
    const memberRef = doc(firestore, 'team_members', memberId);
    deleteDocumentNonBlocking(memberRef);
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

  const addStockItem = useCallback((itemData: Omit<StockItem, 'id'>) => {
    if (!firestore) return;
    const itemId = generateId('stock');
    const newItem = { ...itemData, id: itemId };
    const itemRef = doc(firestore, 'stock_items', itemId);
    setDocumentNonBlocking(itemRef, newItem, { merge: false });
  }, [firestore]);

  const updateStockItem = useCallback((updatedItem: StockItem) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'stock_items', updatedItem.id);
    setDocumentNonBlocking(itemRef, updatedItem, { merge: true });
  }, [firestore]);

  const deleteStockItem = useCallback((itemId: string) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'stock_items', itemId);
    deleteDocumentNonBlocking(itemRef);
  }, [firestore]);

  const value = useMemo(() => ({
    projects: projects || [],
    teamMembers: teamMembers || [],
    stockItems: stockItems || [],
    isLoading: isLoadingProjects || isLoadingTeamMembers || isLoadingStockItems,
    addProject,
    updateProject,
    deleteProject,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    completeProjectStages,
    addStockItem,
    updateStockItem,
    deleteStockItem,
  }), [
    projects, 
    teamMembers, 
    stockItems,
    isLoadingProjects, 
    isLoadingTeamMembers, 
    isLoadingStockItems,
    addProject, 
    updateProject, 
    deleteProject, 
    addTeamMember, 
    updateTeamMember, 
    deleteTeamMember, 
    completeProjectStages,
    addStockItem,
    updateStockItem,
    deleteStockItem,
  ]);


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
