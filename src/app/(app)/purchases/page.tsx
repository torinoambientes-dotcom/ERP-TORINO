'use client';
import { useContext, useMemo, useState } from 'react';
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
import type { StockItem, MaterialItem, GlassItem } from '@/lib/types';
import { AlertTriangle, ChevronsUpDown, CheckCircle, Copy, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ShoppingList {
  [projectName: string]: {
    id: string;
    environments: {
      [environmentName: string]: {
        id: string;
        furnitures: {
          [furnitureName: string]: {
            id: string;
            materials: MaterialItem[];
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
            glassItems: GlassItem[];
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
  const { projects, stockItems, handleStockAlert, markMaterialsAsPurchased } = context;
  const { toast } = useToast();

  const [isStockAlertOpen, setIsStockAlertOpen] = useState(true);

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
          if (furniture.purchase?.status !== 'done' && furniture.materials && furniture.materials.length > 0) {
            environmentFurnitures[furniture.name] = {
              id: furniture.id,
              materials: furniture.materials.sort((a,b) => a.name.localeCompare(b.name)),
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
          if (furniture.glassItems && furniture.glassItems.length > 0) {
            environmentFurnitures[furniture.name] = {
              id: furniture.id,
              glassItems: furniture.glassItems.sort((a,b) => a.type.localeCompare(b.type)),
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


    const copyShoppingListToClipboard = () => {
        let listText = "Lista de Compras Centralizada:\n\n";

        Object.entries(shoppingList).forEach(([projectName, projectData]) => {
            listText += `Projeto: ${projectName}\n`;
            Object.entries(projectData.environments).forEach(([environmentName, environmentData]) => {
                listText += `  Ambiente: ${environmentName}\n`;
                Object.entries(environmentData.furnitures).forEach(([furnitureName, furnitureData]) => {
                  listText += `    Móvel: ${furnitureName}\n`;
                  furnitureData.materials.forEach(item => {
                      listText += `      - ${item.name}: ${item.quantity} ${item.unit}\n`;
                  });
                });
            });
            listText += `\n`;
        });
        
        if (Object.keys(shoppingList).length === 0) {
            listText = "Nenhum material necessário para os projetos ativos."
        }
        
        navigator.clipboard.writeText(listText).then(() => {
            toast({
                title: "Lista de compras copiada!",
                description: "A lista de materiais foi copiada para a área de transferência.",
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
        let listText = `Lista de Compras - Projeto: ${projectName}\n`;
        listText += `Ambiente: ${environmentName}\n\n`;

        Object.entries(furnitures).forEach(([furnitureName, furnitureData]) => {
          listText += `  Móvel: ${furnitureName}\n`;
          furnitureData.materials.forEach(item => {
              listText += `    - ${item.name}: ${item.quantity} ${item.unit}\n`;
          });
        });
        
        navigator.clipboard.writeText(listText).then(() => {
            toast({
                title: `Lista do ambiente "${environmentName}" copiada!`,
                description: "Os materiais foram copiados para a área de transferência.",
            });
        }).catch(err => {
            toast({
                variant: 'destructive',
                title: "Erro ao copiar",
                description: "Não foi possível copiar a lista do ambiente.",
            });
        });
    };
    
    const handleMarkAsPurchased = (projectId: string, environmentId: string, environmentName: string) => {
        markMaterialsAsPurchased(projectId, environmentId);
        toast({
            title: "Materiais marcados como comprados!",
            description: `A etapa de compra para o ambiente "${environmentName}" foi concluída.`,
        });
    };

  const handleMarkAlertAsHandled = (itemId: string, itemName: string) => {
    handleStockAlert(itemId, true);
    toast({
        title: "Alerta Resolvido",
        description: `O alerta para o item "${itemName}" foi marcado como resolvido.`,
    });
  };
  
  const copyFullGlassListToClipboard = () => {
    let listText = "Lista de Vidraçaria Centralizada:\n\n";

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
      listText = "Nenhum item de vidraçaria necessário para os projetos ativos."
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


  return (
    <div className="space-y-8">
      <PageHeader
        title="Compras"
        description="Gerencie sua lista de compras de materiais e vidros, e acompanhe os alertas de estoque."
      />

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="glass">Vidraçaria</TabsTrigger>
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
                    <CardTitle className="font-headline">Lista de Compras de Materiais ({Object.keys(shoppingList).length})</CardTitle>
                    <CardDescription>Materiais de todos os projetos ativos, prontos para a compra.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={copyShoppingListToClipboard} size="sm" disabled={Object.keys(shoppingList).length === 0}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Lista Completa
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
                                                            <Button variant="outline" size="sm" onClick={() => handleMarkAsPurchased(projectData.id, envData.id, environmentName)}>
                                                                <ShoppingCart className="mr-2 h-3 w-3" />
                                                                Marcar como Comprado
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                    {Object.entries(envData.furnitures).map(([furnitureName, furnitureData]) => (
                                                        <div key={furnitureData.id}>
                                                        <p className="font-semibold text-sm">{furnitureName}</p>
                                                        <ul className='space-y-1 text-sm list-disc pl-5 text-muted-foreground'>
                                                        {furnitureData.materials.map((item, index) => (
                                                            <li key={index}>
                                                                <span className="font-medium text-foreground/90">{item.name}:</span> {item.quantity} {item.unit}
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
                    <CardTitle className="font-headline">Lista de Vidraçaria ({Object.keys(glasswareList).length} projetos)</CardTitle>
                    <CardDescription>Vidros e espelhos de todos os projetos ativos, prontos para encomenda.</CardDescription>
                    </div>
                    <Button onClick={copyFullGlassListToClipboard} size="sm" disabled={Object.keys(glasswareList).length === 0}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Lista Completa
                    </Button>
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
                                            <li key={index}>
                                                <span className="font-medium text-foreground/90">{item.type}:</span> {item.quantity} pç(s) - {item.width}mm x {item.height}mm
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
                        <p className="text-sm text-muted-foreground text-center">Nenhum item de vidraçaria necessário para os projetos ativos.</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
