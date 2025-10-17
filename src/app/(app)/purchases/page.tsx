'use client';
import { useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { StockItem, MaterialItem, GlassItem, ProfileDoorItem, PurchaseRequest } from '@/lib/types';
import { AlertTriangle, ChevronsUpDown, CheckCircle, Copy, ShoppingCart, Eye, History, MessageCircle, Truck, PlusCircle, Trash2, Edit, MoreHorizontal, FileSearch, Archive, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCreatorModal } from '@/components/modals/glass-creator-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, getInitials } from '@/lib/utils';
import { RegisterPurchaseModal } from '@/components/modals/register-purchase-modal';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NewPurchaseRequestModal } from '@/components/modals/new-purchase-request-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ViewProfileDoorModal } from '@/components/modals/view-profile-door-modal';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';


interface ShoppingList {
  [projectName: string]: {
    id: string;
    environments: {
      [environmentName: string]: {
        id: string;
        furnitures: {
          [furnitureName: string]: {
            id: string;
            materials: (MaterialItem & { projectId: string; envId: string; furId: string })[];
          };
        };
      };
    };
  };
}

interface GlasswareList {
  [projectName: string]: {
    id: string;
    environments: {
      [environmentName: string]: {
        id: string;
        furnitures: {
          [furnitureName: string]: {
            id: string;
            glassItems: (GlassItem & { projectId: string; envId: string; furId: string })[];
          };
        };
      };
    };
  };
}

interface ProfileDoorList {
  [projectName: string]: {
    id: string;
    environments: {
      [environmentName: string]: {
        id: string;
        furnitures: {
          [furnitureName: string]: {
            id: string;
            profileDoors: (ProfileDoorItem & { projectId: string; envId: string; furId: string })[];
          };
        };
      };
    };
  };
}

interface LowStockInfo extends StockItem {
  demand?: number;
}

const handlePositions: Record<string, string> = {
    left: 'Esquerda',
    right: 'Direita',
    both: 'Ambos os Lados',
    none: 'Nenhum',
    top: 'Em cima',
    bottom: 'Em baixo',
};


export default function PurchasesPage() {
  const router = useRouter();
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('PurchasesPage must be used within an AppProvider');
  }
  const { 
    projects, 
    stockItems, 
    registerPurchase, 
    toggleItemPurchasedStatus, 
    toggleMaterialPurchased,
    purchaseRequests,
    teamMembers,
    updatePurchaseRequestStatus,
    deletePurchaseRequest,
    isLoading
  } = context;
  const { toast } = useToast();
  const { user } = useUser();

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  useEffect(() => {
    if (!isLoading && loggedInMember && loggedInMember.role === 'Projetista') {
      router.push('/');
    }
  }, [isLoading, loggedInMember, router]);

  const [isStockAlertOpen, setIsStockAlertOpen] = useState(true);

  const [isDoorViewerOpen, setIsDoorViewerOpen] = useState(false);
  const [doorToView, setDoorToView] = useState<ProfileDoorItem | null>(null);

  const [isGlassViewerOpen, setIsGlassViewerOpen] = useState(false);
  const [glassToView, setGlassToView] = useState<GlassItem | null>(null);

  const [clientNameToView, setClientNameToView] = useState<string | undefined>(undefined);
  const [environmentNameToView, setEnvironmentNameToView] = useState<string | undefined>(undefined);

  const [showPurchasedMaterials, setShowPurchasedMaterials] = useState(false);
  const [showPurchasedGlass, setShowPurchasedGlass] = useState(false);
  const [showPurchasedDoors, setShowPurchasedDoors] = useState(false);
  
  const [isRegisterPurchaseModalOpen, setRegisterPurchaseModalOpen] = useState(false);
  const [itemToPurchase, setItemToPurchase] = useState<LowStockInfo | null>(null);

  const [isNewRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<PurchaseRequest | null>(null);
  
  const [isDeleteRequestAlertOpen, setDeleteRequestAlertOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PurchaseRequest | null>(null);

  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [showRequestHistory, setShowRequestHistory] = useState(false);

  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);
  const stockItemMap = useMemo(() => new Map(stockItems.map(item => [item.id, item])), [stockItems]);

  const lowStockItems = useMemo((): LowStockInfo[] => {
    return stockItems
      .map(item => {
        const totalReserved = (item.reservations || []).reduce((acc, res) => acc + res.quantity, 0);
        const quantityAwaitingReceipt = item.awaitingReceipt?.quantity || 0;
        const potentialStock = item.quantity + quantityAwaitingReceipt;

        const hasMinStockAlert = typeof item.minStock === 'number' && item.quantity < item.minStock && !item.awaitingReceipt;
        const hasDemandAlert = totalReserved > potentialStock;

        if (hasMinStockAlert || hasDemandAlert) {
            return { ...item, demand: totalReserved };
        }
        return null;
      })
      .filter((item): item is LowStockInfo => item !== null);
  }, [stockItems]);


  const shoppingList = useMemo((): ShoppingList => {
    const list: ShoppingList = {};
    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
        const projectEnvironments: ShoppingList[string]['environments'] = {};

        project.environments.forEach(environment => {
            const environmentFurnitures: ShoppingList[string]['environments'][string]['furnitures'] = {};

            environment.furniture.forEach(furniture => {
                const materialsWithContext = (furniture.materials || [])
                    .filter(m => {
                        const isPurchased = !!m.purchased;

                        if (showPurchasedMaterials) {
                            return isPurchased; // Show only purchased for history
                        }

                        if (isPurchased) {
                            return false; // Hide if already purchased in "to buy" list
                        }

                        if (!m.stockItemId) {
                            return true; // Not a stock item, needs to be bought
                        }
                        
                        const stockItem = stockItemMap.get(m.stockItemId);
                        if (!stockItem) {
                            return true; // Stock item not found, assume it needs to be bought
                        }
                        
                        // Show if reserved quantity is greater than available stock
                        return m.quantity > stockItem.quantity;
                    })
                    .map(material => ({
                        ...material,
                        projectId: project.id,
                        envId: environment.id,
                        furId: furniture.id
                    }));

                if (materialsWithContext.length > 0) {
                    materialsWithContext.sort((a, b) => a.name.localeCompare(b.name));
                    environmentFurnitures[furniture.name] = {
                        id: furniture.id,
                        materials: materialsWithContext,
                    };
                }
            });

            if (Object.keys(environmentFurnitures).length > 0) {
                projectEnvironments[environment.name] = {
                    id: environment.id,
                    furnitures: environmentFurnitures,
                };
            }
        });

        if (Object.keys(projectEnvironments).length > 0) {
            list[project.clientName] = {
                id: project.id,
                environments: projectEnvironments,
            };
        }
    });

    return list;
}, [projects, showPurchasedMaterials, stockItemMap]);

  
  const glasswareList = useMemo((): GlasswareList => {
    const list: GlasswareList = {};
    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
        const projectEnvironments: GlasswareList[string]['environments'] = {};

        project.environments.forEach(environment => {
            const environmentFurnitures: GlasswareList[string]['environments'][string]['furnitures'] = {};

            environment.furniture.forEach(furniture => {
                const items = (furniture.glassItems || [])
                    .filter(item => {
                        const isPurchased = !!item.purchased;
                        return showPurchasedGlass ? isPurchased : !isPurchased;
                    })
                    .map(item => ({...item, projectId: project.id, envId: environment.id, furId: furniture.id }));

                if (items.length > 0) {
                    environmentFurnitures[furniture.name] = {
                        id: furniture.id,
                        glassItems: items.sort((a, b) => a.type.localeCompare(b.type)),
                    };
                }
            });

            if (Object.keys(environmentFurnitures).length > 0) {
                projectEnvironments[environment.name] = {
                    id: environment.id,
                    furnitures: environmentFurnitures,
                };
            }
        });

        if (Object.keys(projectEnvironments).length > 0) {
            list[project.clientName] = {
                id: project.id,
                environments: projectEnvironments,
            };
        }
    });

    return list;
  }, [projects, showPurchasedGlass]);

  const profileDoorList = useMemo((): ProfileDoorList => {
    const list: ProfileDoorList = {};
    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
        const projectEnvironments: ProfileDoorList[string]['environments'] = {};

        project.environments.forEach(environment => {
            const environmentFurnitures: ProfileDoorList[string]['environments'][string]['furnitures'] = {};

            environment.furniture.forEach(furniture => {
                const items = (furniture.profileDoors || [])
                    .filter(item => {
                        const isPurchased = !!item.purchased;
                        return showPurchasedDoors ? isPurchased : !isPurchased;
                    })
                    .map(item => ({...item, projectId: project.id, envId: environment.id, furId: furniture.id }));

                if (items.length > 0) {
                    environmentFurnitures[furniture.name] = {
                        id: furniture.id,
                        profileDoors: items.sort((a,b) => a.profileColor.localeCompare(b.profileColor)),
                    };
                }
            });

            if (Object.keys(environmentFurnitures).length > 0) {
                projectEnvironments[environment.name] = {
                    id: environment.id,
                    furnitures: environmentFurnitures,
                };
            }
        });

        if (Object.keys(projectEnvironments).length > 0) {
            list[project.clientName] = {
                id: project.id,
                environments: projectEnvironments,
            };
        }
    });

    return list;
  }, [projects, showPurchasedDoors]);

    const filteredPurchaseRequests = useMemo(() => {
        return purchaseRequests.filter(req => 
            req.description.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
            req.reason.toLowerCase().includes(requestSearchTerm.toLowerCase())
        );
    }, [purchaseRequests, requestSearchTerm]);

  const pendingCounts = useMemo(() => {
    const activeProjects = projects.filter(p => !p.completedAt);
    
    let materialsCount = 0;
    let glassCount = 0;
    let doorsCount = 0;

    activeProjects.forEach(p => {
        p.environments.forEach(e => {
            e.furniture.forEach(f => {
                (f.materials || []).forEach(m => {
                    if (m.purchased) return;
                    if (!m.stockItemId) {
                        materialsCount++;
                        return;
                    }
                    const stockItem = stockItemMap.get(m.stockItemId);
                    if (!stockItem || m.quantity > stockItem.quantity) {
                        materialsCount++;
                    }
                });
                glassCount += (f.glassItems || []).filter(g => !g.purchased).length;
                doorsCount += (f.profileDoors || []).filter(d => !d.purchased).length;
            });
        });
    });

    return {
      materials: materialsCount,
      glass: glassCount,
      doors: doorsCount,
      requests: purchaseRequests.filter(req => req.status === 'pending').length,
      lowStock: lowStockItems.length,
    };
}, [projects, purchaseRequests, lowStockItems, stockItemMap]);


    const generateShoppingListText = (forWhatsApp: boolean = false) => {
        let listText = "*Lista de Compras Centralizada (Itens a Comprar):*\n\n";
        let hasItemsToBuy = false;

        Object.entries(shoppingList).forEach(([projectName, projectData]) => {
            let projectHasItems = false;
            let projectText = `*Projeto:* ${projectName}\n`;
            
            Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
                let envHasItems = false;
                let envText = `  *Ambiente:* ${environmentName}\n`;
                
                Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
                     if (furnitureData.materials.length > 0) {
                        envHasItems = true;
                        let furText = `    *Móvel:* ${furnitureName}\n`;
                        furnitureData.materials.forEach(item => {
                            furText += `      - ${item.name}: ${item.quantity} ${item.unit}\n`;
                        });
                        envText += furText;
                    }
                });

                if (envHasItems) {
                    projectText += envText;
                    projectHasItems = true;
                }
            });

             if (projectHasItems) {
                listText += projectText + '\n';
                hasItemsToBuy = true;
            }
        });
        
        if (!hasItemsToBuy) {
            return "Nenhum material a comprar nos projetos ativos.";
        }

        return listText;
    }

    const copyShoppingListToClipboard = () => {
        const listText = generateShoppingListText(false);
        
        navigator.clipboard.writeText(listText).then(() => {
            toast({
                title: "Lista de compras copiada!",
                description: "A lista de materiais a comprar foi copiada para a área de transferência.",
            });
        }).catch(err => {
            toast({
                variant: 'destructive',
                title: "Erro ao copiar",
                description: "Não foi possível copiar a lista.",
            });
        });
    };

    const sendShoppingListViaWhatsApp = () => {
        const listText = generateShoppingListText(true);
        const encodedText = encodeURIComponent(listText);
        const whatsappUrl = `https://wa.me/?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };
    
    const copyEnvironmentListToClipboard = (projectName: string, environmentName: string, furnitures: ShoppingList[string]['environments'][string]['furnitures']) => {
        let listText = `Lista de Compras (A Comprar) - Projeto: ${projectName}\n`;
        listText += `Ambiente: ${environmentName}\n\n`;
        let hasItemsToBuy = false;

        Object.entries(furnitures).forEach(([furnitureName, furnitureData]) => {
            if (furnitureData.materials.length > 0) {
                hasItemsToBuy = true;
                listText += `  Móvel: ${furnitureName}\n`;
                furnitureData.materials.forEach(item => {
                    listText += `    - ${item.name}: ${item.quantity} ${item.unit}\n`;
                });
            }
        });

        if (!hasItemsToBuy) {
            listText = `Nenhum item a comprar para o ambiente "${environmentName}".`;
        }
        
        navigator.clipboard.writeText(listText).then(() => {
            toast({
                title: `Lista do ambiente "${environmentName}" copiada!`,
                description: "Os materiais a comprar foram copiados para a área de transferência.",
            });
        }).catch(err => {
            toast({
                variant: 'destructive',
                title: "Erro ao copiar",
                description: "Não foi possível copiar a lista do ambiente.",
            });
        });
    };
    
    const handleToggleMaterial = useCallback((projectId: string, envId: string, furId: string, materialId: string, currentStatus: boolean) => {
        toggleMaterialPurchased(projectId, envId, furId, materialId, !currentStatus);
    }, [toggleMaterialPurchased]);


    const handleOpenPurchaseModal = (item: LowStockInfo) => {
        setItemToPurchase(item);
        setRegisterPurchaseModalOpen(true);
    };

    const handleConfirmPurchase = (itemId: string, quantity: number, supplier: string) => {
        registerPurchase(itemId, quantity, supplier);
        toast({
            title: "Compra Registrada!",
            description: `O item foi movido para "Aguardando Recebimento" na página de Estoque.`,
        });
    };
  
  const copyFullGlassListToClipboard = () => {
    let listText = `Lista de Vidraçaria (${showPurchasedGlass ? 'Comprados' : 'A Comprar'}):\n\n`;

    Object.entries(glasswareList).forEach(([projectName, projectData]) => {
      listText += `Projeto: ${projectName}\n`;
      Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
        listText += `  Ambiente: ${environmentName}\n`;
        Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
          listText += `    Móvel: ${furnitureName}\n`;
          furnitureData.glassItems.forEach(item => {
            listText += `      - ${item.type}: ${item.quantity} pç(s) - ${item.width}mm x ${item.height}mm\n`;
          });
        });
      });
      listText += `\n`;
    });
    
    if (Object.keys(glasswareList).length === 0) {
      listText = `Nenhum item de vidraçaria na lista de ${showPurchasedGlass ? 'comprados' : 'a comprar'}.`
    }
    
    navigator.clipboard.writeText(listText).then(() => {
      toast({
        title: "Lista de vidraçaria copiada!",
        description: "A lista completa foi copiada para a área de transferência.",
      });
    }).catch(err => {
      toast({
        variant: 'destructive',
        title: "Erro ao copiar",
        description: "Não foi possível copiar a lista.",
      });
    });
  };

  const copyFullProfileDoorListToClipboard = () => {
    let listText = `Lista de Portas de Perfil (${showPurchasedDoors ? 'Compradas' : 'A Comprar'}):\n\n`;

    Object.entries(profileDoorList).forEach(([projectName, projectData]) => {
      listText += `Projeto: ${projectName}\n`;
      Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
        listText += `  Ambiente: ${environmentName}\n`;
        Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
          listText += `    Móvel: ${furnitureName}\n`;
          furnitureData.profileDoors.forEach(item => {
            const quantityText = item.doorType === 'Correr' && item.doorSet
              ? `${item.doorSet.count} pçs (Conjunto)`
              : `${item.quantity} pç(s)`;

            listText += `      - Perfil ${item.profileColor} com Vidro ${item.glassType} (${item.handleType}): ${quantityText} - ${item.width}mm x ${item.height}mm\n`;
          });
        });
      });
      listText += `\n`;
    });
    
    if (Object.keys(profileDoorList).length === 0) {
      listText = `Nenhuma porta de perfil na lista de ${showPurchasedDoors ? 'compradas' : 'a comprar'}.`
    }
    
    navigator.clipboard.writeText(listText).then(() => {
      toast({
        title: "Lista de Portas de Perfil copiada!",
        description: "A lista completa foi copiada para a área de transferência.",
      });
    }).catch(err => {
      toast({
        variant: 'destructive',
        title: "Erro ao copiar",
        description: "Não foi possível copiar a lista.",
      });
    });
  };

    const handleOpenDoorViewer = (door: ProfileDoorItem, clientName: string, environmentName: string) => {
        setDoorToView(door);
        setClientNameToView(clientName);
        setEnvironmentNameToView(environmentName);
        setIsDoorViewerOpen(true);
    };

    const handleOpenGlassViewer = (glass: GlassItem, clientName: string) => {
        setGlassToView(glass);
        setClientNameToView(clientName);
        setIsGlassViewerOpen(true);
    };

    const handleToggleItemPurchased = (itemType: 'glass' | 'door', itemId: string, projectId: string, envId: string, furId: string) => {
      toggleItemPurchasedStatus(itemType, itemId, projectId, envId, furId);
      toast({
        title: "Status de compra atualizado!",
      })
    };

    const handleOpenRequestModal = (request: PurchaseRequest | null = null) => {
        setRequestToEdit(request);
        setNewRequestModalOpen(true);
    }
    
    const handleOpenDeleteAlert = (request: PurchaseRequest) => {
        setRequestToDelete(request);
        setDeleteRequestAlertOpen(true);
    }
    
    const handleConfirmDeleteRequest = () => {
        if(requestToDelete) {
            deletePurchaseRequest(requestToDelete.id);
            toast({
                title: "Solicitação Apagada",
                description: "A solicitação de compra foi removida."
            });
            setDeleteRequestAlertOpen(false);
            setRequestToDelete(null);
        }
    }

  const RenderPurchaseRequestList = ({ title, requests, colorClass }: { title: string, requests: PurchaseRequest[], colorClass: string }) => {
    if (requests.length === 0) return null;
    
    return (
      <div key={title}>
        <h3 className="font-semibold mb-2">{title} ({requests.length})</h3>
        <div className="space-y-3">
          {requests.map(req => {
            const requester = memberMap.get(req.requesterId);
            return(
              <div key={req.id} className={cn("p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start gap-4", colorClass)}>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <p className='font-semibold text-base'>{req.description} - {req.quantity} {req.unit}</p>
                    {req.projectId && req.projectName && (
                       <Link href={`/projects/${req.projectId}`} passHref legacyBehavior>
                          <a target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <LinkIcon className="h-3 w-3" />
                              {req.projectName}
                          </a>
                        </Link>
                    )}
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>{req.reason}</p>
                  {requester && (
                      <div className='text-xs text-muted-foreground mt-2 flex items-center gap-1.5'>
                        <Avatar className="h-4 w-4"><AvatarFallback style={{backgroundColor: requester.color}} className="text-[8px] font-bold">{getInitials(requester.name)}</AvatarFallback></Avatar>
                        <span>Solicitado por {requester.name} em {format(new Date(req.createdAt), 'dd/MM/yy \'às\' HH:mm')}</span>
                      </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 self-start flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-background/80 flex gap-2">
                        <span>Ações</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {req.status !== 'approved' && req.status !== 'purchased' && <DropdownMenuItem onClick={() => updatePurchaseRequestStatus(req.id, 'approved')}>Aprovar</DropdownMenuItem>}
                      {req.status !== 'purchased' && <DropdownMenuItem onClick={() => updatePurchaseRequestStatus(req.id, 'purchased')}>Marcar como Comprado</DropdownMenuItem>}
                      {req.status !== 'rejected' && <DropdownMenuItem onClick={() => updatePurchaseRequestStatus(req.id, 'rejected')}>Rejeitar</DropdownMenuItem>}
                      
                      {(req.status === 'approved' || req.status === 'purchased' || req.status === 'rejected') && <DropdownMenuSeparator />}
                      
                      {req.status !== 'pending' && <DropdownMenuItem onClick={() => updatePurchaseRequestStatus(req.id, 'pending')}>Mover para Pendente</DropdownMenuItem>}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleOpenRequestModal(req)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDeleteAlert(req)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Apagar Solicitação</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  if (isLoading || !loggedInMember) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>A carregar...</p>
      </div>
    );
  }

  if (loggedInMember.role === 'Projetista') {
    return null; 
  }


  return (
    <>
    <div className="space-y-8">
      <PageHeader
        title="Compras"
        description="Gerencie sua lista de compras de materiais, vidros e o histórico de solicitações avulsas."
      />

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="materials" className="relative">
              Materiais
              {pendingCounts.materials > 0 && <Badge className="absolute -right-2 -top-2 h-5 min-w-[20px] justify-center px-1.5">{pendingCounts.materials}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="glass" className="relative">
              Vidraçaria
              {pendingCounts.glass > 0 && <Badge className="absolute -right-2 -top-2 h-5 min-w-[20px] justify-center px-1.5">{pendingCounts.glass}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="profileDoors" className="relative">
              Portas de Perfil
              {pendingCounts.doors > 0 && <Badge className="absolute -right-2 -top-2 h-5 min-w-[20px] justify-center px-1.5">{pendingCounts.doors}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
                Solicitações Avulsas
                {pendingCounts.requests > 0 && <Badge variant="destructive" className="absolute -right-2 -top-2 h-5 min-w-[20px] justify-center px-1.5">{pendingCounts.requests}</Badge>}
            </TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-6 space-y-6">
            {!showPurchasedMaterials &&
                <Collapsible
                    open={isStockAlertOpen}
                    onOpenChange={setIsStockAlertOpen}
                    className="w-full"
                >
                    <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                        <div className='space-y-1.5'>
                            <CardTitle className="font-headline">Alerta de Estoque ({pendingCounts.lowStock})</CardTitle>
                            <CardDescription>Materiais com estoque baixo ou com demanda de projetos maior que o estoque.</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon">
                            <ChevronsUpDown className="h-4 w-4" />
                            <span className="sr-only">Toggle</span>
                            </Button>
                        </CollapsibleTrigger>
                        </div>
                    </CardHeader>
                    <CollapsibleContent>
                        <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {lowStockItems.length > 0 ? lowStockItems.map((item) => {
                            const potentialStock = item.quantity + (item.awaitingReceipt?.quantity || 0);
                            const isDemandAlert = (item.demand || 0) > potentialStock;
                            
                            return (
                                <div key={item.id} className="p-3 rounded-md bg-destructive/10 border-l-4 border-destructive flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-destructive/80 font-medium">
                                            {isDemandAlert 
                                                ? `Demanda (${item.demand}) excede o estoque atual + pendente (${potentialStock})`
                                                : `Estoque atual (${item.quantity}) abaixo do mínimo (${item.minStock})`
                                            }
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-background hover:bg-muted w-full sm:w-auto"
                                    onClick={() => handleOpenPurchaseModal(item)}
                                    >
                                    <Truck className="mr-2 h-4 w-4 text-blue-600" />
                                    Registrar Compra
                                    </Button>
                                </div>
                            )
                            }) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum item com estoque baixo.</p>}
                        </div>
                        </CardContent>
                    </CollapsibleContent>
                    </Card>
                </Collapsible>
            }
            
            <Card>
            <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                <div className='space-y-1.5'>
                    <CardTitle className="font-headline">
                        {showPurchasedMaterials ? 'Histórico de Compras de Materiais' : 'Lista de Compras de Materiais'}
                    </CardTitle>
                    <CardDescription>
                        {showPurchasedMaterials ? 'Materiais de projetos que já foram comprados.' : 'Materiais de todos os projetos ativos que precisam ser comprados.'}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setShowPurchasedMaterials(!showPurchasedMaterials)} size="sm" variant="outline">
                        <History className="mr-2 h-4 w-4" />
                        {showPurchasedMaterials ? "Ver Itens a Comprar" : "Ver Histórico"}
                    </Button>
                    {!showPurchasedMaterials && (
                        <>
                            <Button onClick={sendShoppingListViaWhatsApp} size="sm" variant="outline" disabled={Object.keys(shoppingList).length === 0}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar via WhatsApp
                            </Button>
                            <Button onClick={copyShoppingListToClipboard} size="sm" disabled={Object.keys(shoppingList).length === 0}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar Lista (A Comprar)
                            </Button>
                        </>
                    )}
                </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {Object.keys(shoppingList).length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(shoppingList)}>
                            {Object.entries(shoppingList).map(([projectName, projectData]) => (
                                <AccordionItem value={projectName} key={projectName} className='border rounded-lg bg-muted/30'>
                                    <AccordionTrigger className="p-4 font-semibold text-base hover:no-underline">
                                        {projectName}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-3">
                                            {Object.entries(projectData.environments).map(([environmentName, envData]) => (
                                                <div key={envData.id} className="p-3 rounded-md bg-background border">
                                                    <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                                        <h4 className='font-medium'>{environmentName}</h4>
                                                        {!showPurchasedMaterials &&
                                                            <div className='flex gap-1.5'>
                                                                <Button variant="ghost" size="sm" onClick={() => copyEnvironmentListToClipboard(projectName, environmentName, envData.furnitures)}>
                                                                    <Copy className="mr-2 h-3 w-3" />
                                                                    Copiar
                                                                </Button>
                                                            </div>
                                                        }
                                                    </div>
                                                    <div className="space-y-2">
                                                    {Object.entries(envData.furnitures).map(([furnitureName, furnitureData]) => (
                                                        <div key={furnitureData.id}>
                                                        <p className="font-semibold text-sm">{furnitureName}</p>
                                                        <ul className='space-y-2 text-sm pl-1'>
                                                            {furnitureData.materials.map((item, index) => (
                                                                <li key={index} className="flex items-center gap-3">
                                                                     <Checkbox
                                                                        id={`mat-${item.id}`}
                                                                        checked={!!item.purchased}
                                                                        onCheckedChange={() => handleToggleMaterial(item.projectId, item.envId, item.furId, item.id, !!item.purchased)}
                                                                        disabled={showPurchasedMaterials}
                                                                    />
                                                                    <label
                                                                        htmlFor={`mat-${item.id}`}
                                                                        className={cn("flex-grow", showPurchasedMaterials ? "cursor-default" : "cursor-pointer", item.purchased && "line-through text-muted-foreground")}
                                                                    >
                                                                        <span className="font-medium text-foreground/90">{item.name}:</span> {item.quantity} {item.unit}
                                                                        {item.stockItemId && stockItemMap.get(item.stockItemId)?.quantity < item.quantity && (
                                                                            <span className="text-xs font-medium ml-2 rounded-md px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">
                                                                                (Estoque Insuficiente: {stockItemMap.get(item.stockItemId)?.quantity || 0})
                                                                            </span>
                                                                        )}
                                                                    </label>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        </div>
                                                    ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                          <p className="text-sm text-muted-foreground text-center">
                              {showPurchasedMaterials ? 'Nenhum material foi comprado ainda.' : 'Nenhum material necessário para os projetos ativos.'}
                          </p>
                      </div>
                    )}
                </div>
            </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="glass" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                      <div className='space-y-1.5'>
                      <CardTitle className="font-headline">Lista de Vidraçaria ({showPurchasedGlass ? "Comprados" : "A Comprar"})</CardTitle>
                      <CardDescription>Vidros e espelhos de todos os projetos ativos.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button onClick={() => setShowPurchasedGlass(!showPurchasedGlass)} size="sm" variant="outline">
                              <History className="mr-2 h-4 w-4" />
                              {showPurchasedGlass ? "Ver itens a comprar" : "Ver itens comprados"}
                          </Button>
                          <Button onClick={copyFullGlassListToClipboard} size="sm" disabled={Object.keys(glasswareList).length === 0}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Lista
                          </Button>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    {Object.keys(glasswareList).length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(glasswareList)}>
                        {Object.entries(glasswareList).map(([projectName, projectData]) => (
                        <AccordionItem value={projectName} key={projectName} className='border rounded-lg bg-muted/30'>
                            <AccordionTrigger className="p-4 font-semibold text-base hover:no-underline">
                            {projectName}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3">
                                {Object.entries(projectData.environments).map(([environmentName, envData]) => (
                                <div key={envData.id} className="p-3 rounded-md bg-background border">
                                    <h4 className='font-medium mb-3'>{environmentName}</h4>
                                    <div className="space-y-2">
                                    {Object.entries(envData.furnitures).map(([furnitureName, furnitureData]) => (
                                        <div key={furnitureData.id}>
                                        <p className="font-semibold text-sm">{furnitureName}</p>
                                        <ul className='space-y-1 text-sm list-disc pl-5 text-muted-foreground'>
                                            {furnitureData.glassItems.map((item, index) => (
                                            <li key={index} className='flex justify-between items-center gap-2'>
                                                <div>
                                                  <span className="font-medium text-foreground/90">{item.type}:</span> {item.quantity} pç(s) - {item.width}mm x {item.height}mm
                                                </div>
                                                <div className='flex gap-1 flex-shrink-0'>
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenGlassViewer(item, projectName)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Visualizar
                                                    </Button>
                                                    <Button variant={showPurchasedGlass ? 'secondary': 'outline'} size="sm" onClick={() => handleToggleItemPurchased('glass', item.id, item.projectId, item.envId, item.furId)}>
                                                        {showPurchasedGlass ? <History className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                                        {showPurchasedGlass ? 'Mover para "A comprar"' : 'Marcar como comprado'}
                                                    </Button>
                                                </div>
                                            </li>
                                            ))}
                                        </ul>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                ))}
                            </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                    ) : (
                    <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground text-center">Nenhum item de vidraçaria na lista de {showPurchasedGlass ? 'comprados' : 'a comprar'}.</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="profileDoors" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                      <div className='space-y-1.5'>
                      <CardTitle className="font-headline">Lista de Portas de Perfil ({showPurchasedDoors ? 'Compradas' : 'A Comprar'})</CardTitle>
                      <CardDescription>Portas de perfil de todos os projetos ativos.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button onClick={() => setShowPurchasedDoors(!showPurchasedDoors)} size="sm" variant="outline">
                              <History className="mr-2 h-4 w-4" />
                              {showPurchasedDoors ? "Ver portas a comprar" : "Ver portas compradas"}
                          </Button>
                          <Button onClick={copyFullProfileDoorListToClipboard} size="sm" disabled={Object.keys(profileDoorList).length === 0}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Lista
                          </Button>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    {Object.keys(profileDoorList).length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(profileDoorList)}>
                        {Object.entries(profileDoorList).map(([projectName, projectData]) => (
                        <AccordionItem value={projectName} key={projectName} className='border rounded-lg bg-muted/30'>
                            <AccordionTrigger className="p-4 font-semibold text-base hover:no-underline">
                            {projectName}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3">
                                {Object.entries(projectData.environments).map(([environmentName, envData]) => (
                                <div key={envData.id} className="p-3 rounded-md bg-background border">
                                    <h4 className='font-medium mb-3'>{environmentName}</h4>
                                    <div className="space-y-2">
                                    {Object.entries(envData.furnitures).map(([furnitureName, furnitureData]) => (
                                        <div key={furnitureData.id}>
                                        <p className="font-semibold text-sm">{furnitureName}</p>
                                        <ul className='space-y-1 text-sm list-disc pl-5'>
                                            {furnitureData.profileDoors.map((item, index) => {
                                                const quantityText = item.doorType === 'Correr' && item.doorSet
                                                    ? `${item.doorSet.count} pç(s) (Conjunto)`
                                                    : `${item.quantity} pç(s)`;

                                                const handleDetails = item.doorType === 'Correr' && item.doorSet?.doors
                                                  ? item.doorSet.doors.map((d, i) => `Porta ${i+1}: ${handlePositions[d.handlePosition] || 'N/A'}`).join(' / ')
                                                  : handlePositions[item.handlePosition || 'left'];

                                                return (
                                                    <li key={index} className='flex justify-between items-center gap-2'>
                                                        <div className='text-muted-foreground'>
                                                            <p className="font-medium text-foreground/90">
                                                                {item.quantity}x Porta {item.profileColor} / Vidro {item.glassType}
                                                            </p>
                                                            <p>
                                                                {item.width}mm x {item.height}mm - Puxador: {item.handleType} ({handleDetails})
                                                            </p>
                                                        </div>
                                                        <div className='flex gap-1 flex-shrink-0'>
                                                          <Button variant="ghost" size="sm" onClick={() => handleOpenDoorViewer(item, projectName, environmentName)}>
                                                              <Eye className="mr-2 h-4 w-4" />
                                                              Visualizar
                                                          </Button>
                                                          <Button variant={showPurchasedDoors ? 'secondary' : 'outline'} size="sm" onClick={() => handleToggleItemPurchased('door', item.id, item.projectId, item.envId, item.furId)}>
                                                              {showPurchasedDoors ? <History className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                                              {showPurchasedDoors ? 'Mover para "A comprar"' : 'Comprado'}
                                                          </Button>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                ))}
                            </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                    ) : (
                    <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                        <p className="text-sm text-muted-foreground text-center">Nenhuma porta de perfil na lista de {showPurchasedDoors ? 'compradas' : 'a comprar'}.</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="requests" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className='space-y-1.5'>
                      <CardTitle className="font-headline">Solicitações de Compra Avulsas</CardTitle>
                      <CardDescription>Itens que não pertencem a projetos, como material de escritório ou ferramentas.</CardDescription>
                      </div>
                      <div className='flex gap-2 w-full sm:w-auto'>
                        <div className="relative flex-grow">
                          <FileSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Pesquisar solicitações..."
                            value={requestSearchTerm}
                            onChange={(e) => setRequestSearchTerm(e.target.value)}
                            className="pl-8 w-full"
                          />
                        </div>
                        <Button onClick={() => setShowRequestHistory(!showRequestHistory)} variant="outline">
                            <Archive className="mr-2 h-4 w-4" />
                            {showRequestHistory ? "Ocultar Histórico" : "Ver Histórico"}
                        </Button>
                        <Button onClick={() => handleOpenRequestModal(null)} className="flex-shrink-0">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Nova
                        </Button>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                <div className="space-y-6">
                  <RenderPurchaseRequestList
                    title="Pendentes de Aprovação"
                    requests={filteredPurchaseRequests.filter(r => r.status === 'pending')}
                    colorClass="border-amber-500 bg-amber-50"
                  />
                  <RenderPurchaseRequestList
                    title="Aprovadas (Aguardando Compra)"
                    requests={filteredPurchaseRequests.filter(r => r.status === 'approved')}
                    colorClass="border-blue-500 bg-blue-50"
                  />

                  {filteredPurchaseRequests.filter(r => r.status === 'pending' || r.status === 'approved').length === 0 && (
                      <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                          <p className="text-sm text-muted-foreground text-center">
                              Nenhuma solicitação de compra ativa no momento.
                          </p>
                      </div>
                  )}

                  <Collapsible open={showRequestHistory} onOpenChange={setShowRequestHistory}>
                    <CollapsibleContent className="space-y-6 mt-6">
                      <Separator />
                      <RenderPurchaseRequestList
                        title="Histórico: Compradas"
                        requests={filteredPurchaseRequests.filter(r => r.status === 'purchased')}
                        colorClass="border-green-500 bg-green-50"
                      />
                      <RenderPurchaseRequestList
                        title="Histórico: Rejeitadas"
                        requests={filteredPurchaseRequests.filter(r => r.status === 'rejected')}
                        colorClass="border-red-500 bg-red-50"
                      />
                      {filteredPurchaseRequests.filter(r => r.status === 'purchased' || r.status === 'rejected').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">O histórico de solicitações está vazio.</p>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    {isDoorViewerOpen && doorToView && (
        <ViewProfileDoorModal
            isOpen={isDoorViewerOpen}
            onClose={() => setIsDoorViewerOpen(false)}
            clientName={clientNameToView}
            environmentName={environmentNameToView}
            door={doorToView}
        />
    )}
     {isGlassViewerOpen && (
        <GlassCreatorModal
            isOpen={isGlassViewerOpen}
            onClose={() => setIsGlassViewerOpen(false)}
            onSave={() => {}} // Dummy onSave for view-only mode
            clientName={clientNameToView}
            glassToEdit={glassToView}
            viewOnly={true}
        />
    )}
    {itemToPurchase && (
      <RegisterPurchaseModal
        isOpen={isRegisterPurchaseModalOpen}
        onClose={() => setRegisterPurchaseModalOpen(false)}
        item={itemToPurchase}
        onConfirm={handleConfirmPurchase}
      />
    )}
    <NewPurchaseRequestModal 
        isOpen={isNewRequestModalOpen}
        onClose={() => setNewRequestModalOpen(false)}
        requestToEdit={requestToEdit}
    />
     <AlertDialog open={isDeleteRequestAlertOpen} onOpenChange={setDeleteRequestAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Apagar Solicitação?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A solicitação para <span className="font-bold">{requestToDelete?.description}</span> será permanentemente removida.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteRequestAlertOpen(false)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, Apagar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
