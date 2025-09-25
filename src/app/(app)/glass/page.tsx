'use client';
import { useContext, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { GlassItem } from '@/lib/types';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function GlassPage() {
  const { projects } = useContext(AppContext);
  const { toast } = useToast();

  const glasswareList = useMemo((): GlasswareList => {
    const list: GlasswareList = {};
    const activeProjects = projects.filter(p => !p.completedAt);

    activeProjects.forEach(project => {
      const projectEnvironments: GlasswareList[string]['environments'] = {};

      project.environments.forEach(environment => {
        const environmentFurnitures: GlasswareList[string]['environments'][string]['furnitures'] = {};

        environment.furniture.forEach(furniture => {
          // A compra de material geral não afeta a necessidade de vidros.
          // Consideramos os vidros necessários enquanto o projeto está ativo.
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

  const copyFullListToClipboard = () => {
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
        title="Vidraçaria"
        description="Liste todos os vidros e espelhos necessários para os projetos ativos."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className='space-y-1.5'>
              <CardTitle className="font-headline">Lista Centralizada ({Object.keys(glasswareList).length} projetos)</CardTitle>
              <CardDescription>Vidros e espelhos de todos os projetos ativos, prontos para encomenda.</CardDescription>
            </div>
            <Button onClick={copyFullListToClipboard} size="sm" disabled={Object.keys(glasswareList).length === 0}>
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
    </div>
  );
}
