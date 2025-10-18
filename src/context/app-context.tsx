'use client';

import { createContext, type ReactNode, useCallback, useMemo, useEffect, useState } from 'react';
import { collection, doc, serverTimestamp, deleteField, writeBatch, getDocs, runTransaction, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import type { Project, TeamMember, StageStatus, StockItem, StockMovement, StockCategory, Furniture, Environment, MaterialItem, StockReservation, ProductionStage, Appointment, PurchaseRequest, PurchaseRequestStatus, Quote, QuoteStage, QuoteEnvironment, QuoteFurniture, QuoteMaterial, QuoteMaterialCategory, Dispatch, Task } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';


interface AppContextType {
  projects: Project[];
  teamMembers: TeamMember[];
  appointments: Appointment[];
  tasks: Task[];
  stockItems: StockItem[];
  stockCategories: StockCategory[];
  stockMovements: StockMovement[];
  purchaseRequests: PurchaseRequest[];
  quotes: Quote[];
  quoteMaterials: QuoteMaterial[];
  quoteMaterialCategories: QuoteMaterialCategory[];
  isLoading: boolean;
  addProject: (projectData: any) => string | undefined;
  updateProject: (updatedProject: Project, originalProject?: Project) => void;
  deleteProject: (projectId: string) => void;
  addTeamMember: (memberData: Omit<TeamMember, 'id' | 'userId'> & { password?: string, email: string }) => Promise<void>;
  updateTeamMember: (updatedMember: TeamMember) => void;
  deleteTeamMember: (memberId: string) => void;
  addAppointment: (appointmentData: Omit<Appointment, 'id'>) => void;
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => void;
  deleteAppointment: (appointmentId: string) => void;
  addTasks: (tasksData: Omit<Task, 'id'>[]) => void;
  updateTaskStatus: (taskId: string, status: 'todo' | 'in_progress' | 'done') => void;
  completeProjectStages: (projectId: string) => void;
  addStockItem: (itemData: Omit<StockItem, 'id'>) => void;
  updateStockItem: (updatedItem: StockItem) => void;
  deleteStockItem: (itemId: string) => void;
  addStockMovement: (itemId: string, movementData: Omit<StockMovement, 'id' | 'timestamp' | 'stockItemId'>) => Promise<void>;
  addStockCategory: (categoryData: Omit<StockCategory, 'id'>) => void;
  deleteStockCategory: (categoryId: string) => void;
  handleStockAlert: (itemId: string, markAsHandled: boolean) => void;
  toggleItemPurchasedStatus: (itemType: 'glass' | 'door', itemId: string, projectId: string, envId: string, furId: string) => void;
  toggleMaterialPurchased: (projectId: string, envId: string, furId: string, materialId: string, purchased: boolean) => void;
  clearAllReservations: () => void;
  dispatchItemToProduction: (stockItemId: string, reservation: StockReservation, memberId: string, marceneiroId: string) => void;
  registerPurchase: (itemId: string, quantity: number, supplier: string) => void;
  confirmStockReceipt: (item: StockItem) => void;
  addPurchaseRequest: (requestData: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updatePurchaseRequest: (requestData: PurchaseRequest) => void;
  updatePurchaseRequestStatus: (requestId: string, status: PurchaseRequestStatus, notes?: string) => void;
  deletePurchaseRequest: (requestId: string) => void;
  addQuote: (quoteData: Pick<Quote, 'clientName' | 'clientContact' | 'environments' | 'projectOrigin'>) => void;
  updateQuote: (quoteId: string, updates: Partial<Quote>) => void;
  deleteQuote: (quoteId: string) => void;
  addQuoteMaterial: (itemData: Omit<QuoteMaterial, 'id'>) => void;
  updateQuoteMaterial: (updatedItem: QuoteMaterial) => void;
  deleteQuoteMaterial: (itemId: string) => void;
  addQuoteMaterialCategory: (categoryData: Omit<QuoteMaterialCategory, 'id'>) => void;
  deleteQuoteMaterialCategory: (categoryId: string) => void;
}

export const AppContext = createContext<AppContextType>({
  projects: [],
  teamMembers: [],
  appointments: [],
  tasks: [],
  stockItems: [],
  stockCategories: [],
  stockMovements: [],
  purchaseRequests: [],
  quotes: [],
  quoteMaterials: [],
  quoteMaterialCategories: [],
  isLoading: true,
  addProject: () => undefined,
  updateProject: () => {},
  deleteProject: () => {},
  addTeamMember: async () => {},
  updateTeamMember: () => {},
  deleteTeamMember: () => {},
  addAppointment: () => {},
  updateAppointment: () => {},
  deleteAppointment: () => {},
  addTasks: () => {},
  updateTaskStatus: () => {},
  completeProjectStages: () => {},
  addStockItem: () => {},
  updateStockItem: () => {},
  deleteStockItem: () => {},
  addStockMovement: async () => {},
  addStockCategory: () => {},
  deleteStockCategory: () => {},
  handleStockAlert: () => {},
  toggleItemPurchasedStatus: () => {},
  toggleMaterialPurchased: () => {},
  clearAllReservations: () => {},
  dispatchItemToProduction: () => {},
  registerPurchase: () => {},
  confirmStockReceipt: () => {},
  addPurchaseRequest: () => {},
  updatePurchaseRequest: () => {},
  updatePurchaseRequestStatus: () => {},
  deletePurchaseRequest: () => {},
  addQuote: () => {},
  updateQuote: () => {},
  deleteQuote: () => {},
  addQuoteMaterial: () => {},
  updateQuoteMaterial: () => {},
  deleteQuoteMaterial: () => {},
  addQuoteMaterialCategory: () => {},
  deleteQuoteMaterialCategory: () => {},
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
  const { user } = useUser();

  const projectsQuery = useMemoFirebase(() => collection(firestore, 'projects'), [firestore]);
  const teamMembersQuery = useMemoFirebase(() => collection(firestore, 'team_members'), [firestore]);
  const appointmentsQuery = useMemoFirebase(() => collection(firestore, 'appointments'), [firestore]);
  const tasksQuery = useMemoFirebase(() => collection(firestore, 'tasks'), [firestore]);
  const stockItemsQuery = useMemoFirebase(() => collection(firestore, 'stock_items'), [firestore]);
  const stockCategoriesQuery = useMemoFirebase(() => collection(firestore, 'stock_categories'), [firestore]);
  const stockMovementsQuery = useMemoFirebase(() => collection(firestore, 'stock_movements'), [firestore]);
  const purchaseRequestsQuery = useMemoFirebase(() => collection(firestore, 'purchase_requests'), [firestore]);
  const quotesQuery = useMemoFirebase(() => collection(firestore, 'quotes'), [firestore]);
  const quoteMaterialsQuery = useMemoFirebase(() => collection(firestore, 'quote_materials'), [firestore]);
  const quoteMaterialCategoriesQuery = useMemoFirebase(() => collection(firestore, 'quote_material_categories'), [firestore]);


  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);
  const { data: teamMembersData, isLoading: isLoadingTeamMembers } = useCollection<TeamMember>(teamMembersQuery);
  const { data: appointments, isLoading: isLoadingAppointments } = useCollection<Appointment>(appointmentsQuery);
  const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);
  const { data: stockItems, isLoading: isLoadingStockItems } = useCollection<StockItem>(stockItemsQuery);
  const { data: stockCategoriesData, isLoading: isLoadingStockCategories } = useCollection<StockCategory>(stockCategoriesQuery);
  const { data: stockMovements, isLoading: isLoadingMovements } = useCollection<StockMovement>(stockMovementsQuery);
  const { data: purchaseRequests, isLoading: isLoadingPurchaseRequests } = useCollection<PurchaseRequest>(purchaseRequestsQuery);
  const { data: quotes, isLoading: isLoadingQuotes } = useCollection<Quote>(quotesQuery);
  const { data: quoteMaterials, isLoading: isLoadingQuoteMaterials } = useCollection<QuoteMaterial>(quoteMaterialsQuery);
  const { data: quoteMaterialCategories, isLoading: isLoadingQuoteMaterialCategories } = useCollection<QuoteMaterialCategory>(quoteMaterialCategoriesQuery);

  const teamMembers = useMemo(() => teamMembersData || [], [teamMembersData]);
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
        furniture: env.furniture.map((fur: any) => ({ // Cast fur to any to access productionTime
          ...fur,
          id: generateId('fur'),
          productionTime: fur.productionTime || 0,
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
    return projectId;
  }, [firestore]);
  
    const updateProject = useCallback(async (updatedProject: Project, originalProject?: Project) => {
    if (!firestore || !stockItems) return;

    let projectWithCompletion = { ...updatedProject };

    const allStagesDone = (updatedProject.environments || []).every(env =>
        (env.furniture || []).every(fur =>
            fur.measurement.status === 'done' &&
            fur.cutting.status === 'done' &&
            fur.purchase.status === 'done' &&
            fur.assembly.status === 'done'
        )
    );

    if (allStagesDone && !updatedProject.completedAt) {
      projectWithCompletion.completedAt = new Date().toISOString();
    }


    projectWithCompletion = cleanupUndefinedFields(projectWithCompletion);
    
    const batch = writeBatch(firestore);
    
    const projectRef = doc(firestore, 'projects', projectWithCompletion.id);
    batch.set(projectRef, projectWithCompletion, { merge: true });

    // --- Handle stock reservations ---
    const originalMaterials = originalProject?.environments.flatMap(e => e.furniture.flatMap(f => (f.materials || []).map(m => ({ ...m, projectId: originalProject.id })))) || [];
    const updatedMaterials = projectWithCompletion.environments.flatMap(e => e.furniture.flatMap(f => (f.materials || []).map(m => ({...m, projectId: projectWithCompletion.id}))));
    
    const materialToDetails = new Map<string, { projName: string, envId: string, envName: string, furId: string, furName: string }>();
    projectWithCompletion.environments.forEach(env => {
        env.furniture.forEach(fur => {
            (fur.materials || []).forEach(mat => {
                materialToDetails.set(mat.id, {
                    projName: projectWithCompletion.clientName,
                    envId: env.id,
                    envName: env.name,
                    furId: fur.id,
                    furName: fur.name,
                });
            });
        });
    });


    // Find removed/modified materials to remove/update reservations
    originalMaterials.forEach(origMat => {
        if (origMat.stockItemId) {
            const updatedMat = updatedMaterials.find(updMat => updMat.id === origMat.id);
            // If material was removed OR is no longer a stock item, remove reservation
            if (!updatedMat || !updatedMat.stockItemId) {
                 const stockItem = stockItems.find(si => si.id === origMat.stockItemId);
                 if (stockItem) {
                     const stockItemRef = doc(firestore, 'stock_items', stockItem.id);
                     const newReservations = (stockItem.reservations || []).filter(res => res.materialId !== origMat.id);
                     batch.update(stockItemRef, { reservations: newReservations });
                 }
            }
        }
    });

    // Find added/modified materials to add/update reservations
    updatedMaterials.forEach(updMat => {
        if (updMat.stockItemId) {
            const origMat = originalMaterials.find(om => om.id === updMat.id);
            // If it's a new stock item OR the quantity/item itself changed
            if (!origMat || origMat.stockItemId !== updMat.stockItemId || origMat.quantity !== updMat.quantity) {
                const stockItem = stockItems.find(si => si.id === updMat.stockItemId);
                if (stockItem) {
                    const details = materialToDetails.get(updMat.id);
                    if (details) {
                        const stockItemRef = doc(firestore, 'stock_items', stockItem.id);
                        const otherReservations = (stockItem.reservations || []).filter(res => res.materialId !== updMat.id);
                        const newReservation: StockReservation = {
                            projectId: projectWithCompletion.id,
                            projectName: details.projName,
                            environmentId: details.envId,
                            environmentName: details.envName,
                            furnitureId: details.furId,
                            furnitureName: details.furName,
                            materialId: updMat.id,
                            quantity: updMat.quantity,
                            status: 'reservado', // Default status for new reservations
                        };
                        const finalReservations = [...otherReservations, newReservation];
                        batch.update(stockItemRef, { reservations: finalReservations });
                    }
                }
            }
        }
    });


    await batch.commit();

  }, [firestore, stockItems]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!firestore || !projects || !stockItems) return;

    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    const batch = writeBatch(firestore);

    // Remove reservations associated with this project
    const materialsInProject = projectToDelete.environments.flatMap(e => e.furniture.flatMap(f => f.materials || []));
    const stockItemsToUpdate = new Map<string, StockReservation[]>();

    materialsInProject.forEach(mat => {
        if (mat.stockItemId) {
            const stockItem = stockItems.find(si => si.id === mat.stockItemId);
            if (stockItem) {
                const updatedReservations = (stockItem.reservations || []).filter(res => res.projectId !== projectId);
                stockItemsToUpdate.set(stockItem.id, updatedReservations);
            }
        }
    });

    stockItemsToUpdate.forEach((reservations, stockItemId) => {
        const stockItemRef = doc(firestore, 'stock_items', stockItemId);
        batch.update(stockItemRef, { reservations });
    });

    // Delete the project document
    const projectRef = doc(firestore, 'projects', projectId);
    batch.delete(projectRef);

    await batch.commit();
  }, [firestore, projects, stockItems]);


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
  
    const addAppointment = useCallback((appointmentData: Omit<Appointment, 'id'>) => {
        if (!firestore) return;
        const appointmentId = generateId('apt');
        const newAppointment = { ...appointmentData, id: appointmentId };
        const appointmentRef = doc(firestore, 'appointments', appointmentId);
        setDocumentNonBlocking(appointmentRef, newAppointment, { merge: false });
    }, [firestore]);
    
    const updateAppointment = useCallback((appointmentId: string, updates: Partial<Appointment>) => {
        if (!firestore) return;
        const appointmentRef = doc(firestore, 'appointments', appointmentId);
        updateDocumentNonBlocking(appointmentRef, updates);
    }, [firestore]);

    const deleteAppointment = useCallback((appointmentId: string) => {
        if (!firestore) return;
        const appointmentRef = doc(firestore, 'appointments', appointmentId);
        deleteDocumentNonBlocking(appointmentRef);
    }, [firestore]);

    const addTasks = useCallback((tasksData: Omit<Task, 'id'>[]) => {
      if (!firestore) return;
      const batch = writeBatch(firestore);
      const allTasksData = tasksData.map(taskData => {
        const taskId = generateId('task');
        const newTask: Task = { ...taskData, id: taskId };
        const taskRef = doc(firestore, 'tasks', taskId);
        batch.set(taskRef, newTask);
        return newTask;
      });

      batch.commit().catch(error => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: 'tasks',
            operation: 'write',
            requestResourceData: allTasksData,
          })
        )
      });
    }, [firestore]);

    const updateTaskStatus = useCallback((taskId: string, status: 'todo' | 'in_progress' | 'done') => {
      if (!firestore) return;
      const taskRef = doc(firestore, 'tasks', taskId);
      updateDocumentNonBlocking(taskRef, { status: status });
    }, [firestore]);

  const completeProjectStages = useCallback((projectId: string) => {
    if (!projects) return;

    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate) {
        const now = new Date().toISOString();
        const newEnvironments = projectToUpdate.environments.map((env) => ({
            ...env,
            furniture: env.furniture.map((fur) => {
                const updatedFur = { ...fur };
                (['measurement', 'cutting', 'purchase', 'assembly'] as const).forEach(stage => {
                    if (updatedFur[stage].status !== 'done') {
                        updatedFur[stage] = { ...updatedFur[stage], status: 'done' as StageStatus, completedAt: updatedFur[stage].completedAt || now };
                    }
                });
                return updatedFur;
            }),
        }));
        const updatedProject = { ...projectToUpdate, environments: newEnvironments };
        updateProject(updatedProject, projectToUpdate);
    }
  }, [projects, updateProject]);

  const addStockItem = useCallback((itemData: Omit<StockItem, 'id'>) => {
    if (!firestore) return;
    const itemId = generateId('stock');
    const newItem = { ...itemData, id: itemId, reservations: [] };
    const itemRef = doc(firestore, 'stock_items', itemId);
    setDocumentNonBlocking(itemRef, newItem, { merge: false });
  }, [firestore]);

  const updateStockItem = useCallback((updatedItem: StockItem) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'stock_items', updatedItem.id);
    const cleanItem = { ...updatedItem };
    if (!cleanItem.reservations) {
        cleanItem.reservations = [];
    }
    setDocumentNonBlocking(itemRef, cleanItem, { merge: true });
  }, [firestore]);

  const deleteStockItem = useCallback((itemId: string) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'stock_items', itemId);
    deleteDocumentNonBlocking(itemRef);
  }, [firestore]);

  const addStockMovement = useCallback(async (itemId: string, movementData: Omit<StockMovement, 'id' | 'timestamp' | 'stockItemId'>) => {
    if (!firestore) {
      throw new Error("Firestore is not initialized.");
    }
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const itemRef = doc(firestore, 'stock_items', itemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error("O item de estoque não foi encontrado.");
        }

        const itemData = itemDoc.data() as StockItem;
        const currentQuantity = itemData.quantity;
        const movementQuantity = movementData.quantity;
        
        let newQuantity;
        if (movementData.type === 'entry') {
          newQuantity = currentQuantity + movementQuantity;
        } else {
          if (currentQuantity < movementQuantity) {
            throw new Error('A quantidade de saída não pode ser maior que o estoque atual.');
          }
          newQuantity = currentQuantity - movementQuantity;
        }

        // Update stock item quantity
        const updateData: { quantity: number; alertHandledAt?: any } = { quantity: newQuantity };
        if (typeof itemData.minStock === 'number' && newQuantity >= itemData.minStock) {
            updateData.alertHandledAt = deleteField();
        }
        transaction.update(itemRef, updateData);

        // Add movement record
        const movementId = generateId('move');
        const newMovement: StockMovement = {
          ...movementData,
          id: movementId,
          stockItemId: itemId,
          timestamp: new Date().toISOString(),
        };
        const movementRef = doc(firestore, 'stock_movements', movementId);
        transaction.set(movementRef, newMovement);
      });
    } catch (error) {
      console.error("Transaction failed: ", error);
      throw new Error(`Falha na Movimentação: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [firestore]);
  
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
    
    updateProject({ ...project, environments: newEnvironments }, project);
  }, [projects, updateProject]);

  const toggleMaterialPurchased = useCallback((projectId: string, envId: string, furId: string, materialId: string, purchased: boolean) => {
    if (!projects) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newEnvironments = project.environments.map(env => {
        if (env.id === envId) {
            const newFurniture = env.furniture.map(fur => {
                if (fur.id === furId) {
                    const newMaterials = (fur.materials || []).map(mat => {
                        if (mat.id === materialId) {
                            return { ...mat, purchased };
                        }
                        return mat;
                    });
                    return { ...fur, materials: newMaterials };
                }
                return fur;
            });
            return { ...env, furniture: newFurniture };
        }
        return env;
    });

    updateProject({ ...project, environments: newEnvironments }, project);
  }, [projects, updateProject]);

  const clearAllReservations = useCallback(async () => {
    if (!firestore || !stockItems) return;

    const batch = writeBatch(firestore);
    stockItems.forEach(item => {
        if (item.reservations && item.reservations.length > 0) {
            const stockItemRef = doc(firestore, 'stock_items', item.id);
            batch.update(stockItemRef, { reservations: [] });
        }
    });
    await batch.commit();
  }, [firestore, stockItems]);
  
  const dispatchItemToProduction = useCallback(async (stockItemId: string, reservation: StockReservation, memberId: string, marceneiroId: string) => {
    if (!firestore || !teamMembers) return;
    const marceneiro = teamMembers.find(m => m.id === marceneiroId);
    if (!marceneiro) {
        console.error("Marceneiro não encontrado!");
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const stockItemRef = doc(firestore, 'stock_items', stockItemId);
            const projectRef = doc(firestore, 'projects', reservation.projectId);
            
            const stockItemDoc = await transaction.get(stockItemRef);
            const projectDoc = await transaction.get(projectRef);

            if (!stockItemDoc.exists() || !projectDoc.exists()) {
                throw new Error("Item de estoque ou projeto não encontrado.");
            }

            const stockItem = stockItemDoc.data() as StockItem;
            const project = projectDoc.data() as Project;
            
            const newProject = JSON.parse(JSON.stringify(project));
            const env = newProject.environments.find((e: Environment) => e.id === reservation.environmentId);
            if (!env) throw new Error("Ambiente não encontrado no projeto.");
            const fur = env.furniture.find((f: Furniture) => f.id === reservation.furnitureId);
            if (!fur?.materials) throw new Error("Móvel ou lista de materiais não encontrados.");
            
            const materialToDispatch = fur.materials.find((m: MaterialItem) => m.id === reservation.materialId);
            if (!materialToDispatch) throw new Error("Material a ser despachado não encontrado no projeto.");

            const totalNeeded = materialToDispatch.quantity;
            const alreadyDispatched = (materialToDispatch.dispatches || []).reduce((acc: number, d: Dispatch) => acc + d.quantity, 0);
            const stillNeeded = totalNeeded - alreadyDispatched;

            const dispatchQuantity = Math.min(stockItem.quantity, stillNeeded);
            if (dispatchQuantity <= 0) {
                console.log("No stock to dispatch or reservation already fulfilled.");
                return;
            }
            
            // 1. Update Stock Item: Reduce quantity and update/remove reservation
            const newStockQuantity = stockItem.quantity - dispatchQuantity;
            const newReservations = (stockItem.reservations || []).map(res => {
                if (res.materialId === reservation.materialId) {
                    return { ...res, quantity: res.quantity - dispatchQuantity };
                }
                return res;
            }).filter(res => res.quantity > 0);
            transaction.update(stockItemRef, { 
                quantity: newStockQuantity,
                reservations: newReservations,
            });

            // 2. Update Project's Material Item: Add a dispatch record
            const newDispatch: Dispatch = {
                quantity: dispatchQuantity,
                dispatchedAt: new Date().toISOString(),
                memberId: memberId,
            };
            materialToDispatch.dispatches = [...(materialToDispatch.dispatches || []), newDispatch];
            const newTotalDispatched = alreadyDispatched + dispatchQuantity;
            if (newTotalDispatched >= totalNeeded) {
                materialToDispatch.purchased = true;
            }

            transaction.set(projectRef, newProject, { merge: true });

            // 3. Add Movement Record
            const movementId = generateId('move');
            const movementDetails = `Projeto: ${reservation.projectName} | Entregue para: ${marceneiro.name}`;
            const newMovement: StockMovement = {
                id: movementId, stockItemId, type: 'exit',
                quantity: dispatchQuantity,
                reason: 'despacho_producao',
                details: movementDetails,
                timestamp: new Date().toISOString(), memberId,
            };
            const movementRef = doc(firestore, 'stock_movements', movementId);
            transaction.set(movementRef, newMovement);
        });
    } catch (e: any) {
        console.error("Erro ao despachar item: ", e);
        throw e;
    }
  }, [firestore, teamMembers]);

  const registerPurchase = useCallback((itemId: string, quantity: number, supplier: string) => {
    if (!firestore) return;
    const itemRef = doc(firestore, 'stock_items', itemId);
    const update = {
      awaitingReceipt: {
        quantity: quantity,
        supplier: supplier,
        registeredAt: new Date().toISOString(),
      }
    };
    updateDocumentNonBlocking(itemRef, update);
  }, [firestore]);

  const confirmStockReceipt = useCallback((item: StockItem) => {
    if (!firestore || !item.awaitingReceipt || !user) return;

    const batch = writeBatch(firestore);
    const itemRef = doc(firestore, 'stock_items', item.id);

    // Update quantity and remove awaitingReceipt field
    const newQuantity = item.quantity + item.awaitingReceipt.quantity;
    batch.update(itemRef, {
      quantity: newQuantity,
      awaitingReceipt: deleteField(),
    });

    // Add movement record
    const movementId = generateId('move');
    const newMovement: StockMovement = {
      id: movementId,
      stockItemId: item.id,
      memberId: user.uid,
      type: 'entry',
      quantity: item.awaitingReceipt.quantity,
      reason: 'compra',
      details: `Fornecedor: ${item.awaitingReceipt.supplier}`,
      timestamp: new Date().toISOString(),
    };
    const movementRef = doc(firestore, 'stock_movements', movementId);
    batch.set(movementRef, newMovement);

    batch.commit();

  }, [firestore, user]);

    const addPurchaseRequest = useCallback((requestData: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
        if (!firestore) return;
        const now = new Date().toISOString();
        const newRequest: PurchaseRequest = {
            ...requestData,
            id: generateId('pr'),
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        };
        const requestRef = doc(firestore, 'purchase_requests', newRequest.id);
        setDocumentNonBlocking(requestRef, newRequest, { merge: false });
    }, [firestore]);
    
    const updatePurchaseRequest = useCallback((requestData: PurchaseRequest) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'purchase_requests', requestData.id);
        const updateData = {
            ...requestData,
            updatedAt: new Date().toISOString(),
        }
        updateDocumentNonBlocking(requestRef, updateData);
    }, [firestore]);


    const updatePurchaseRequestStatus = useCallback((requestId: string, status: PurchaseRequestStatus, notes?: string) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'purchase_requests', requestId);
        const updateData: any = {
            status: status,
            updatedAt: new Date().toISOString(),
        };
        if (notes) {
            updateData.notes = notes;
        }
        updateDocumentNonBlocking(requestRef, updateData);
    }, [firestore]);

    const deletePurchaseRequest = useCallback((requestId: string) => {
        if (!firestore) return;
        const requestRef = doc(firestore, 'purchase_requests', requestId);
        deleteDocumentNonBlocking(requestRef);
    }, [firestore]);

    const addQuote = useCallback((quoteData: Pick<Quote, 'clientName' | 'clientContact' | 'environments' | 'projectOrigin'>) => {
      if (!firestore) return;
      const now = new Date().toISOString();
      const quoteId = generateId('quote');
      
      // We need to cast the environments here to ensure they match the Quote's structure
      const quoteEnvironments: QuoteEnvironment[] = quoteData.environments.map((env: any) => ({
        id: generateId('env'),
        name: env.name,
        furniture: env.furniture.map((fur: any) => ({
          id: generateId('fur'),
          name: fur.name,
          productionTime: fur.productionTime || 0,
          materials: [],
          glassItems: [],
          profileDoors: []
        }))
      }));

      const newQuote: Quote = {
        id: quoteId,
        clientName: quoteData.clientName,
        clientContact: quoteData.clientContact,
        projectOrigin: quoteData.projectOrigin,
        environments: quoteEnvironments,
        createdAt: now,
        updatedAt: now,
        internalProjectStage: { status: 'todo', responsibleIds: [] },
        materialSurveyStage: { status: 'todo', responsibleIds: [] },
        descriptiveStage: { status: 'todo', responsibleIds: [] },
        presentationStatus: 'pending_send',
        clientFeedback: 'analyzing',
        totalValue: 0,
      };
      
      const quoteRef = doc(firestore, 'quotes', quoteId);
      setDocumentNonBlocking(quoteRef, newQuote, { merge: false });
    }, [firestore]);

    const updateQuote = useCallback((quoteId: string, updates: Partial<Quote>) => {
      if (!firestore) return;
      const quoteRef = doc(firestore, 'quotes', quoteId);
      const dataWithTimestamp = { ...updates, updatedAt: new Date().toISOString() };
      updateDocumentNonBlocking(quoteRef, dataWithTimestamp);
    }, [firestore]);

    const deleteQuote = useCallback((quoteId: string) => {
      if (!firestore) return;
      const quoteRef = doc(firestore, 'quotes', quoteId);
      deleteDocumentNonBlocking(quoteRef);
    }, [firestore]);
    
    const addQuoteMaterial = useCallback((itemData: Omit<QuoteMaterial, 'id'>) => {
        if (!firestore) return;
        const itemId = generateId('qmat');
        const newItem = { ...itemData, id: itemId };
        const itemRef = doc(firestore, 'quote_materials', itemId);
        addDocumentNonBlocking(itemRef.parent, newItem);
    }, [firestore]);

    const updateQuoteMaterial = useCallback((updatedItem: QuoteMaterial) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'quote_materials', updatedItem.id);
        updateDocumentNonBlocking(itemRef, updatedItem);
    }, [firestore]);

    const deleteQuoteMaterial = useCallback((itemId: string) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'quote_materials', itemId);
        deleteDocumentNonBlocking(itemRef);
    }, [firestore]);

    const addQuoteMaterialCategory = useCallback((categoryData: Omit<QuoteMaterialCategory, 'id'>) => {
        if (!firestore) return;
        const categoryId = generateId('qcat');
        const newCategory = { ...categoryData, id: categoryId };
        const categoryRef = doc(firestore, 'quote_material_categories', categoryId);
        addDocumentNonBlocking(categoryRef.parent, newCategory);
    }, [firestore]);

    const deleteQuoteMaterialCategory = useCallback((categoryId: string) => {
        if (!firestore) return;
        const categoryRef = doc(firestore, 'quote_material_categories', categoryId);
        deleteDocumentNonBlocking(categoryRef);
    }, [firestore]);


  const value = useMemo(() => ({
    projects: projects || [],
    teamMembers,
    appointments: appointments || [],
    tasks: tasks || [],
    stockItems: stockItems || [],
    stockCategories: stockCategories,
    stockMovements: stockMovements || [],
    purchaseRequests: purchaseRequests || [],
    quotes: quotes || [],
    quoteMaterials: quoteMaterials || [],
    quoteMaterialCategories: quoteMaterialCategories || [],
    isLoading: isLoadingProjects || isLoadingTeamMembers || isLoadingAppointments || isLoadingTasks || isLoadingStockItems || isLoadingStockCategories || isLoadingMovements || isLoadingPurchaseRequests || isLoadingQuotes || isLoadingQuoteMaterials || isLoadingQuoteMaterialCategories,
    addProject,
    updateProject,
    deleteProject,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addTasks,
    updateTaskStatus,
    completeProjectStages,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    addStockCategory,
    deleteStockCategory,
    handleStockAlert,
    toggleItemPurchasedStatus,
    toggleMaterialPurchased,
    clearAllReservations,
    dispatchItemToProduction,
    registerPurchase,
    confirmStockReceipt,
    addPurchaseRequest,
    updatePurchaseRequest,
    updatePurchaseRequestStatus,
    deletePurchaseRequest,
    addQuote,
    updateQuote,
    deleteQuote,
    addQuoteMaterial,
    updateQuoteMaterial,
    deleteQuoteMaterial,
    addQuoteMaterialCategory,
    deleteQuoteMaterialCategory,
  }), [
    projects, 
    teamMembers, 
    appointments, 
    tasks,
    stockItems,
    stockCategories,
    stockMovements,
    purchaseRequests,
    quotes,
    quoteMaterials,
    quoteMaterialCategories,
    isLoadingProjects, 
    isLoadingTeamMembers, 
    isLoadingAppointments,
    isLoadingTasks,
    isLoadingStockItems,
    isLoadingStockCategories,
    isLoadingMovements,
    isLoadingPurchaseRequests,
    isLoadingQuotes,
    isLoadingQuoteMaterials,
    isLoadingQuoteMaterialCategories,
    addProject, 
    updateProject, 
    deleteProject, 
    addTeamMember, 
    updateTeamMember, 
    deleteTeamMember,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addTasks,
    updateTaskStatus,
    completeProjectStages,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    addStockCategory,
    deleteStockCategory,
    handleStockAlert,
    toggleItemPurchasedStatus,
    toggleMaterialPurchased,
    clearAllReservations,
    dispatchItemToProduction,
    registerPurchase,
    confirmStockReceipt,
    addPurchaseRequest,
    updatePurchaseRequest,
    updatePurchaseRequestStatus,
    deletePurchaseRequest,
    addQuote,
    updateQuote,
    deleteQuote,
    addQuoteMaterial,
    updateQuoteMaterial,
    deleteQuoteMaterial,
    addQuoteMaterialCategory,
    deleteQuoteMaterialCategory,
  ]);


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
