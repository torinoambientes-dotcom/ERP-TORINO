'use client';

import { createContext, type ReactNode, useCallback, useMemo } from 'react';
import { collection, doc, serverTimestamp, deleteField } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Project, TeamMember, StageStatus, StockItem, StockMovement, StockCategory, Furniture, Environment } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';


interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  stockItems: StockItem[];
  stockCategories: StockCategory[];
  isLoading: boolean;
  addProject: (projectData: any) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: string) => void;
  addTeamMember: (memberData: Omit<TeamMember, 'id' | 'userId'> & { password?: string, email: string }) => Promise<void>;
  updateTeamMember: (updatedMember: TeamMember) => void;
  deleteTeamMember: (memberId: string) => void;
  completeProjectStages: (projectId: string) => void;
  markMaterialsAsPurchased: (projectId: string, environmentId: string) => void;
  addStockItem: (itemData: Omit<StockItem, 'id'>) => void;
  updateStockItem: (updatedItem: StockItem) => void;
  deleteStockItem: (itemId: string) => void;
  addStockMovement: (itemId: string, movementData: Omit<StockMovement, 'id' | 'timestamp'>) => void;
  addStockCategory: (categoryData: Omit<StockCategory, 'id'>) => void;
  deleteStockCategory: (categoryId: string) => void;
  handleStockAlert: (itemId: string, markAsHandled: boolean) => void;
  toggleItemPurchasedStatus: (itemType: 'glass' | 'door', itemId: string, projectId: string, envId: string, furId: string) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  stockItems: [],
  stockCategories: [],
  isLoading: true,
  addProject: () => {},
  updateProject: () => {},
  deleteProject: () => {},
  addTeamMember: async () => {},
  updateTeamMember: () => {},
  deleteTeamMember: () => {},
  completeProjectStages: () => {},
  markMaterialsAsPurchased: () => {},
  addStockItem: () => {},
  updateStockItem: () => {},
  deleteStockItem: () => {},
  addStockMovement: () => {},
  addStockCategory: () => {},
  deleteStockCategory: () => {},
  handleStockAlert: () => {},
  toggleItemPurchasedStatus: () => {},
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

const cleanupUndefinedFields = (obj: any) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanupUndefinedFields);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = cleanupUndefinedFields(value);
      }
    }
  }
  return newObj;
};


export function AppProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const auth = useAuth();

  const projectsQuery = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const teamMembersQuery = useMemoFirebase(() => collection(firestore, 'team_members'), [firestore]);
  const stockItemsQuery = useMemoFirebase(() => collection(firestore, 'stock_items'), [firestore]);
  const stockCategoriesQuery = useMemoFirebase(() => collection(firestore, 'stock_categories'), [firestore]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const { data: teamMembers, isLoading: isLoadingTeamMembers } = useCollection<TeamMember>(teamMembersQuery);
  const { data: stockItems, isLoading: isLoadingStockItems } = useCollection<StockItem>(stockItemsQuery);
  const { data: stockCategoriesData, isLoading: isLoadingStockCategories } = useCollection<StockCategory>(stockCategoriesQuery);

  const stockCategories = useMemo(() => stockCategoriesData || [], [stockCategoriesData]);
  
  const addProject = useCallback((projectData: Omit<Project, 'id' | 'environments'> & { environments: Array<Omit<Project['environments'][0], 'id' | 'furniture'> & { furniture: Array<Omit<Furniture, 'id' | 'measurement' | 'cutting' | 'purchase' | 'assembly' | 'comments' | 'pendencies' | 'materials' | 'glassItems' | 'profileDoors'>>}>}) => {
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
          materials: [],
          glassItems: [],
          profileDoors: [],
        })),
      })),
    };
    const projectRef = doc(firestore, 'projects', projectId);
    setDocumentNonBlocking(projectRef, newProject, { merge: false });
  }, [firestore]);

  const updateProject = useCallback((updatedProject: Project) => {
    if (!firestore) return;
    
    let projectWithCompletion = { ...updatedProject };
    
    if (isProjectComplete(projectWithCompletion) && !projectWithCompletion.completedAt) {
      projectWithCompletion.completedAt = new Date().toISOString();
    }
    
    // Clean up undefined values before sending to Firestore
    projectWithCompletion = cleanupUndefinedFields(projectWithCompletion);
    
    const projectRef = doc(firestore, 'projects', projectWithCompletion.id);
    setDocumentNonBlocking(projectRef, projectWithCompletion, { merge: true });
  }, [firestore]);


  const deleteProject = useCallback((projectId: string) => {
    if (!firestore) return;
    const projectRef = doc(firestore, 'projects', projectId);
    deleteDocumentNonBlocking(projectRef);
  }, [firestore]);

  const addTeamMember = useCallback(async (memberData: Omit<TeamMember, 'id'> & { password?: string }) => {
    if (!firestore || !auth) {
      throw new Error('Serviços de autenticação ou banco de dados não estão disponíveis.');
    }
    
    const { email, password, ...restOfData } = memberData;
    
    if (!email || !password) {
      throw new Error('E-mail e senha são obrigatórios para criar um novo membro.');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;

      const newMember: TeamMember = {
        ...restOfData,
        id: newUserId,
        email: email,
      };

      const memberRef = doc(firestore, 'team_members', newUserId);
      await setDocumentNonBlocking(memberRef, newMember, { merge: false });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está em uso por outra conta.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('A senha é muito fraca. Use pelo menos 6 caracteres.');
      }
      console.error("Error adding team member:", error);
      throw new Error('Ocorreu um erro ao criar o usuário.');
    }
  }, [firestore, auth]);


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

  const markMaterialsAsPurchased = useCallback((projectId: string, environmentId: string) => {
      if (!projects) return;
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const newEnvironments = project.environments.map(env => {
          if (env.id === environmentId) {
              const newFurniture = env.furniture.map(fur => ({
                  ...fur,
                  purchase: { ...fur.purchase, status: 'done' as StageStatus }
              }));
              return { ...env, furniture: newFurniture };
          }
          return env;
      });

      const updatedProject = { ...project, environments: newEnvironments };
      updateProject(updatedProject);
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

  const addStockMovement = useCallback((itemId: string, movementData: Omit<StockMovement, 'id' | 'timestamp'>) => {
    if (!firestore || !stockItems) return;
    
    const itemToUpdate = stockItems.find(item => item.id === itemId);
    if (!itemToUpdate) return;
    
    const currentQuantity = itemToUpdate.quantity;
    const movementQuantity = movementData.quantity;
    const newQuantity = movementData.type === 'entry' ? currentQuantity + movementQuantity : currentQuantity - movementQuantity;

    const updateData: { quantity: number; alertHandledAt?: any } = { quantity: newQuantity };

    if (typeof itemToUpdate.minStock === 'number' && newQuantity >= itemToUpdate.minStock) {
        updateData.alertHandledAt = deleteField();
    }

    const itemRef = doc(firestore, 'stock_items', itemId);
    setDocumentNonBlocking(itemRef, updateData, { merge: true });

    const movementId = generateId('move');
    const newMovement: StockMovement = {
      ...movementData,
      id: movementId,
      timestamp: new Date().toISOString(),
    };
    const movementRef = collection(firestore, 'stock_items', itemId, 'movements');
    addDocumentNonBlocking(movementRef, newMovement);

  }, [firestore, stockItems]);
  
  const addStockCategory = useCallback((categoryData: Omit<StockCategory, 'id'>) => {
    if (!firestore) return;
    const categoryId = generateId('cat');
    const newCategory = { ...categoryData, id: categoryId };
    const categoryRef = doc(firestore, 'stock_categories', categoryId);
    setDocumentNonBlocking(categoryRef, newCategory, { merge: false });
  }, [firestore]);

  const deleteStockCategory = useCallback((categoryId: string) => {
    if (!firestore) return;
    const categoryRef = doc(firestore, 'stock_categories', categoryId);
    deleteDocumentNonBlocking(categoryRef);
  }, [firestore]);

  const handleStockAlert = useCallback((itemId: string, markAsHandled: boolean) => {
      if (!firestore) return;
      const itemRef = doc(firestore, 'stock_items', itemId);
      const update = markAsHandled
        ? { alertHandledAt: new Date().toISOString() }
        : { alertHandledAt: deleteField() };
      
      setDocumentNonBlocking(itemRef, update, { merge: true });
  }, [firestore]);

  const toggleItemPurchasedStatus = useCallback((itemType: 'glass' | 'door', itemId: string, projectId: string, envId: string, furId: string) => {
    if (!projects) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newEnvironments = project.environments.map(env => {
      if (env.id === envId) {
        const newFurniture = env.furniture.map(fur => {
          if (fur.id === furId) {
            if (itemType === 'glass') {
              const newGlassItems = (fur.glassItems || []).map(item =>
                item.id === itemId ? { ...item, purchased: !item.purchased } : item
              );
              return { ...fur, glassItems: newGlassItems };
            } else if (itemType === 'door') {
              const newProfileDoors = (fur.profileDoors || []).map(item =>
                item.id === itemId ? { ...item, purchased: !item.purchased } : item
              );
              return { ...fur, profileDoors: newProfileDoors };
            }
          }
          return fur;
        });
        return { ...env, furniture: newFurniture };
      }
      return env;
    });
    
    updateProject({ ...project, environments: newEnvironments });
  }, [projects, updateProject]);


  const value = useMemo(() => ({
    projects: projects || [],
    teamMembers: teamMembers || [],
    stockItems: stockItems || [],
    stockCategories: stockCategories,
    isLoading: isLoadingProjects || isLoadingTeamMembers || isLoadingStockItems || isLoadingStockCategories,
    addProject,
    updateProject,
    deleteProject,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    completeProjectStages,
    markMaterialsAsPurchased,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    addStockCategory,
    deleteStockCategory,
    handleStockAlert,
    toggleItemPurchasedStatus,
  }), [
    projects, 
    teamMembers, 
    stockItems,
    stockCategories,
    isLoadingProjects, 
    isLoadingTeamMembers, 
    isLoadingStockItems,
    isLoadingStockCategories,
    addProject, 
    updateProject, 
    deleteProject, 
    addTeamMember, 
    updateTeamMember, 
    deleteTeamMember, 
    completeProjectStages,
    markMaterialsAsPurchased,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    addStockCategory,
    deleteStockCategory,
    handleStockAlert,
    toggleItemPurchasedStatus,
  ]);


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
