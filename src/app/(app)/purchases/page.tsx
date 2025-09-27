'use client';
import { useContext, useMemo, useState, useCallback } from 'react';
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
import type { StockItem, MaterialItem, GlassItem, ProfileDoorItem } from '@/lib/types';
import { AlertTriangle, ChevronsUpDown, CheckCircle, Copy, ShoppingCart, Eye, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileDoorCreatorModal } from '@/components/modals/profile-door-creator-modal';
import { GlassCreatorModal } from '@/components/modals/glass-creator-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


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


export default function PurchasesPage() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('PurchasesPage must be used within an AppProvider');
  }
  const { projects, stockItems, handleStockAlert, toggleItemPurchasedStatus, toggleMaterialPurchased } = context;
  const { toast } = useToast();

  const [isStockAlertOpen, setIsStockAlertOpen] = useState(true);

  const [isDoorViewerOpen, setIsDoorViewerOpen] = useState(false);
  const [doorToView, setDoorToView] = useState<ProfileDoorItem | null>(null);

  const [isGlassViewerOpen, setIsGlassViewerOpen] = useState(false);
  const [glassToView, setGlassToView] = useState<GlassItem | null>(null);

  const [clientNameToView, setClientNameToView] = useState<string | undefined>(undefined);

  const [showPurchasedGlass, setShowPurchasedGlass] = useState(false);
  const [showPurchasedDoors, setShowPurchasedDoors] = useState(false);

  const lowStockItems = useMemo((): StockItem[] => {
    return stockItems.filter(item => 
        typeof item.minStock === 'number' && 
        item.quantity < item.minStock &&
        !item.alertHandledAt
    );
  }, [stockItems]);

  const shoppingList = useMemo((): ShoppingList => {
    const list: ShoppingList = {};
    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
        const projectEnvironments: ShoppingList[string]['environments'] = {};

        project.environments.forEach(environment => {
            const environmentFurnitures: ShoppingList[string]['environments'][string]['furnitures'] = {};

            environment.furniture.forEach(furniture => {
                 const materialsWithContext = (furniture.materials || []).map(material => ({
                    ...material,
                    projectId: project.id,
                    envId: environment.id,
                    furId: furniture.id
                }));
                
                if (materialsWithContext.length > 0) {
                    // Ordena: itens não comprados primeiro, depois por nome.
                    materialsWithContext.sort((a, b) => {
                        if (a.purchased && !b.purchased) return 1;
                        if (!a.purchased && b.purchased) return -1;
                        return a.name.localeCompare(b.name);
                    });

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
  }, [projects]);

  
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


    const copyShoppingListToClipboard = () => {
        let listText = "Lista de Compras Centralizada (Itens a Comprar):\n\n";
        let hasItemsToBuy = false;

        Object.entries(shoppingList).forEach(([projectName, projectData]) => {
            let projectHasItems = false;
            let projectText = `Projeto: ${projectName}\n`;
            
            Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
                let envHasItems = false;
                let envText = `  Ambiente: ${environmentName}\n`;
                
                Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
                    const itemsToBuy = furnitureData.materials.filter(item => !item.purchased);
                    if (itemsToBuy.length > 0) {
                        envHasItems = true;
                        let furText = `    Móvel: ${furnitureName}\n`;
                        itemsToBuy.forEach(item => {
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
            listText = "Nenhum material a comprar nos projetos ativos."
        }
        
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
    
    const copyEnvironmentListToClipboard = (projectName: string, environmentName: string, furnitures: ShoppingList[string]['environments'][string]['furnitures']) => {
        let listText = `Lista de Compras (A Comprar) - Projeto: ${projectName}\n`;
        listText += `Ambiente: ${environmentName}\n\n`;
        let hasItemsToBuy = false;

        Object.entries(furnitures).forEach(([furnitureName, furnitureData]) => {
            const itemsToBuy = furnitureData.materials.filter(item => !item.purchased);
            if (itemsToBuy.length > 0) {
                hasItemsToBuy = true;
                listText += `  Móvel: ${furnitureName}\n`;
                itemsToBuy.forEach(item => {
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


  const handleMarkAlertAsHandled = (itemId: string, itemName: string) => {
    handleStockAlert(itemId, true);
    toast({
        title: "Alerta Resolvido",
        description: `O alerta para o item "${itemName}" foi marcado como resolvido.`,
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
    let listText = `Lista de Portas de Perfil (${showPurchasedDoors ? 'Comprados' : 'A Comprar'}):\n\n`;

    Object.entries(profileDoorList).forEach(([projectName, projectData]) => {
      listText += `Projeto: ${projectName}\n`;
      Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
        listText += `  Ambiente: ${environmentName}\n`;
        Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
          listText += `    Móvel: ${furnitureName}\n`;
          furnitureData.profileDoors.forEach(item => {
            listText += `      - Perfil ${item.profileColor} com Vidro ${item.glassType} (${item.handleType}): ${item.quantity} pç(s) - ${item.width}mm x ${item.height}mm\n`;
          });
        });
      });
      listText += `\n`;
    });
    
    if (Object.keys(profileDoorList).length === 0) {
      listText = `Nenhuma porta de perfil na lista de ${showPurchasedDoors ? 'comprados' : 'a comprar'}.`
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

    const handleOpenDoorViewer = (door: ProfileDoorItem, clientName: string) => {
        setDoorToView(door);
        setClientNameToView(clientName);
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


  return (
    <>
    <div className="space-y-8">
      <PageHeader
        title="Compras"
        description="Gerencie sua lista de compras de materiais e vidros, e acompanhe os alertas de estoque."
      />

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="glass">Vidraçaria</TabsTrigger>
            <TabsTrigger value="profileDoors">Portas de Perfil</TabsTrigger>
        </TabsList>
        <TabsContent value="materials" className="mt-6 space-y-6">
            <Collapsible
                open={isStockAlertOpen}
                onOpenChange={setIsStockAlertOpen}
                className="w-full"
            >
                <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                    <div className='space-y-1.5'>
                        <CardTitle className="font-headline">Alerta de Estoque Mínimo ({lowStockItems.length})</CardTitle>
                        <CardDescription>Lista de materiais que atingiram o nível mínimo de estoque.</CardDescription>
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
                        {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                        <div key={item.id} className="p-3 rounded-md bg-destructive/10 border-l-4 border-destructive flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-sm text-destructive/80 font-medium">
                                        Atual: {item.quantity} | Mínimo: {item.minStock} ({item.unit})
                                    </p>
                                </div>
                            </div>
                            <Button
                            size="sm"
                            variant="outline"
                            className="bg-background hover:bg-muted w-full sm:w-auto"
                            onClick={() => handleMarkAlertAsHandled(item.id, item.name)}
                            >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Marcar como Resolvido
                            </Button>
                        </div>
                        )) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum item com estoque baixo.</p>}
                    </div>
                    </CardContent>
                </CollapsibleContent>
                </Card>
            </Collapsible>
            
            <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                <div className='space-y-1.5'>
                    <CardTitle className="font-headline">Lista de Compras de Materiais</CardTitle>
                    <CardDescription>Materiais de todos os projetos ativos, prontos para a compra.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={copyShoppingListToClipboard} size="sm" disabled={Object.keys(shoppingList).length === 0}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Lista (A Comprar)
                    </Button>
                </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {Object.keys(shoppingList).length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-4">
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
                                                        <div className='flex gap-1.5'>
                                                            <Button variant="ghost" size="sm" onClick={() => copyEnvironmentListToClipboard(projectName, environmentName, envData.furnitures)}>
                                                                <Copy className="mr-2 h-3 w-3" />
                                                                Copiar
                                                            </Button>
                                                        </div>
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
                                                                    />
                                                                    <label
                                                                        htmlFor={`mat-${item.id}`}
                                                                        className={cn("flex-grow cursor-pointer", item.purchased && "line-through text-muted-foreground")}
                                                                    >
                                                                        <span className="font-medium text-foreground/90">{item.name}:</span> {item.quantity} {item.unit}
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
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhum material necessário para os projetos ativos.</p>}
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
                    <Accordion type="multiple" className="w-full space-y-4">
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
                    <Accordion type="multiple" className="w-full space-y-4">
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
                                        <ul className='space-y-1 text-sm list-disc pl-5 text-muted-foreground'>
                                            {furnitureData.profileDoors.map((item, index) => (
                                            <li key={index} className='flex justify-between items-center gap-2'>
                                                <div>
                                                    <span className="font-medium text-foreground/90">Perfil {item.profileColor} com Vidro {item.glassType} ({item.handleType}):</span> {item.quantity} pç(s) - {item.width}mm x {item.height}mm
                                                </div>
                                                <div className='flex gap-1 flex-shrink-0'>
                                                  <Button variant="ghost" size="sm" onClick={() => handleOpenDoorViewer(item, projectName)}>
                                                      <Eye className="mr-2 h-4 w-4" />
                                                      Visualizar
                                                  </Button>
                                                  <Button variant={showPurchasedDoors ? 'secondary' : 'outline'} size="sm" onClick={() => handleToggleItemPurchased('door', item.id, item.projectId, item.envId, item.furId)}>
                                                      {showPurchasedDoors ? <History className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                                      {showPurchasedDoors ? 'Mover para "A comprar"' : 'Comprado'}
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
                        <p className="text-sm text-muted-foreground text-center">Nenhuma porta de perfil na lista de {showPurchasedDoors ? 'compradas' : 'a comprar'}.</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    {isDoorViewerOpen && (
        <ProfileDoorCreatorModal
            isOpen={isDoorViewerOpen}
            onClose={() => setIsDoorViewerOpen(false)}
            onSave={() => {}} // Dummy onSave for view-only mode
            clientName={clientNameToView}
            doorToEdit={doorToView}
            viewOnly={true}
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
    </>
  );
}
