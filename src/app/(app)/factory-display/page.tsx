'use client';
import { useState, useMemo, useContext, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MonitorPlay, X, Check, ChevronsUpDown, PlusCircle, Trash2, History } from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/context/app-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import useLocalStorage from '@/hooks/use-local-storage';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ExtraProject {
    id: string;
    name: string;
    description: string;
    assignedTo: string[];
    isCompleted: boolean;
}

export default function FactoryDisplaySettingsPage() {
  const { teamMembers } = useContext(AppContext);
  const [rotationTime, setRotationTime] = useLocalStorage('factoryDisplay:rotationTime', 60);
  const [customMessage, setCustomMessage] = useLocalStorage('factoryDisplay:customMessage', '');
  const [selectedMarceneiros, setSelectedMarceneiros] = useLocalStorage<string[]>('factoryDisplay:selectedMarceneiros', []);
  const [extraProjects, setExtraProjects] = useLocalStorage<ExtraProject[]>('factoryDisplay:extraProjects', []);
  const [open, setOpen] = useState(false)
  const [showCompletedExtras, setShowCompletedExtras] = useState(false);


  const marceneiros = useMemo(() => {
    return (teamMembers || []).filter(member => member.role === 'Marceneiro');
  }, [teamMembers]);

  // Select all by default when the component loads and marceneiros are available
  useEffect(() => {
    if (marceneiros.length > 0 && selectedMarceneiros.length === 0) {
      setSelectedMarceneiros(marceneiros.map(m => m.id));
    }
  }, [marceneiros, selectedMarceneiros.length, setSelectedMarceneiros]);

  const generatePlayUrl = () => {
    const params = new URLSearchParams();
    if (selectedMarceneiros.length > 0) {
      params.append('carpenters', selectedMarceneiros.join(','));
    }
    if (rotationTime > 0) {
      params.append('time', String(rotationTime));
    }
    if (customMessage.trim()) {
      params.append('message', customMessage.trim());
    }
    if (extraProjects.length > 0) {
        params.append('extraProjects', JSON.stringify(extraProjects));
    }
    return `/factory-display/play?${params.toString()}`;
  };

  const addExtraProject = () => {
    setExtraProjects([...extraProjects, { id: `extra-${Date.now()}`, name: '', description: '', assignedTo: [], isCompleted: false }]);
  };

  const updateExtraProject = (id: string, field: keyof ExtraProject, value: any) => {
    setExtraProjects(extraProjects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  
  const removeExtraProject = (id: string) => {
    setExtraProjects(extraProjects.filter(p => p.id !== id));
  };
  
  const { activeExtraProjects, completedExtraProjects } = useMemo(() => {
    const active: ExtraProject[] = [];
    const completed: ExtraProject[] = [];
    extraProjects.forEach(p => {
        if(p.isCompleted) {
            completed.push(p);
        } else {
            active.push(p);
        }
    });
    return { activeExtraProjects: active, completedExtraProjects: completed };
  }, [extraProjects]);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Ecrã da Fábrica"
        description="Configure e inicie a apresentação para o monitor da sua fábrica."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configurações da Apresentação</CardTitle>
                    <CardDescription>
                       Personalize o que será exibido no ecrã da fábrica.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Selecionar Marceneiros</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                           <div className="flex gap-1 flex-wrap">
                            {selectedMarceneiros.length === 0 ? "Nenhum marceneiro selecionado" : 
                             selectedMarceneiros.length === marceneiros.length ? "Todos os marceneiros" :
                              selectedMarceneiros.map(id => {
                                const member = marceneiros.find(m => m.id === id);
                                return <Badge key={id} variant="secondary">{member?.name.split(' ')[0]}</Badge>
                              })
                            }
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Procurar marceneiro..." />
                          <CommandList>
                            <CommandEmpty>Nenhum marceneiro encontrado.</CommandEmpty>
                            <CommandGroup>
                              {marceneiros.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  value={member.name}
                                  onSelect={() => {
                                    const isSelected = selectedMarceneiros.includes(member.id);
                                    if(isSelected) {
                                      setSelectedMarceneiros(selectedMarceneiros.filter(id => id !== member.id));
                                    } else {
                                      setSelectedMarceneiros([...selectedMarceneiros, member.id]);
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMarceneiros.includes(member.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {member.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rotation-time">Tempo de Rotação (segundos)</Label>
                    <Input 
                      id="rotation-time"
                      type="number"
                      value={rotationTime}
                      onChange={e => setRotationTime(Number(e.target.value))}
                      placeholder="Ex: 60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-message">Mensagem Personalizada (Opcional)</Label>
                    <Textarea 
                      id="custom-message"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      placeholder="Ex: Parabéns pela meta atingida!"
                    />
                  </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Projetos Extras Manuais (Ativos)</CardTitle>
                    <CardDescription>
                       Adicione projetos ou tarefas que não estão no sistema para aparecer no ecrã.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeExtraProjects.length > 0 ? activeExtraProjects.map((project, index) => (
                        <div key={project.id} className="border p-4 rounded-lg space-y-3 bg-muted/50 relative">
                             <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeExtraProject(project.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                            <div className="flex items-center space-x-2">
                                <Switch id={`completed-switch-${project.id}`} checked={project.isCompleted} onCheckedChange={(checked) => updateExtraProject(project.id, 'isCompleted', checked)} />
                                <Label htmlFor={`completed-switch-${project.id}`} className="font-medium">Concluído</Label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`extra-name-${index}`}>Nome do Projeto/Tarefa Extra</Label>
                                <Input 
                                    id={`extra-name-${index}`}
                                    value={project.name}
                                    onChange={e => updateExtraProject(project.id, 'name', e.target.value)}
                                    placeholder="Ex: Prateleiras para a recepção"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`extra-desc-${index}`}>Descrição Breve</Label>
                                <Textarea 
                                    id={`extra-desc-${index}`}
                                    value={project.description}
                                    onChange={e => updateExtraProject(project.id, 'description', e.target.value)}
                                    placeholder="Ex: Cortar e fitar 3 prateleiras de 120x30cm."
                                    rows={2}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label>Atribuir aos Marceneiros</Label>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        {project.assignedTo.length > 0 ? `${project.assignedTo.length} marceneiro(s) selecionado(s)` : "Selecionar marceneiros"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Procurar marceneiro..." />
                                        <CommandList>
                                        <CommandEmpty>Nenhum marceneiro encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {marceneiros.map(member => (
                                            <CommandItem
                                                key={member.id}
                                                value={member.name}
                                                onSelect={() => {
                                                    const isSelected = project.assignedTo.includes(member.id);
                                                    const newAssignedTo = isSelected
                                                        ? project.assignedTo.filter(id => id !== member.id)
                                                        : [...project.assignedTo, member.id];
                                                    updateExtraProject(project.id, 'assignedTo', newAssignedTo);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", project.assignedTo.includes(member.id) ? "opacity-100" : "opacity-0")} />
                                                {member.name}
                                            </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto extra ativo.</p>
                    )}

                    <Button variant="outline" onClick={addExtraProject}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Projeto Extra
                    </Button>

                    {completedExtraProjects.length > 0 && (
                      <Collapsible open={showCompletedExtras} onOpenChange={setShowCompletedExtras}>
                        <CollapsibleTrigger asChild>
                           <Button variant="ghost" className="w-full mt-4">
                             <History className="mr-2 h-4 w-4" />
                             {showCompletedExtras ? 'Ocultar Histórico' : 'Ver Histórico'} ({completedExtraProjects.length})
                           </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-4">
                            {completedExtraProjects.map((project, index) => (
                                <div key={project.id} className="border p-4 rounded-lg space-y-3 bg-muted/80 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeExtraProject(project.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                        <Switch id={`completed-switch-${project.id}`} checked={project.isCompleted} onCheckedChange={(checked) => updateExtraProject(project.id, 'isCompleted', checked)} />
                                        <Label htmlFor={`completed-switch-${project.id}`} className="font-medium text-muted-foreground line-through">Concluído</Label>
                                    </div>
                                    <p className="font-medium text-muted-foreground line-through">{project.name}</p>
                                    <p className="text-sm text-muted-foreground line-through">{project.description}</p>
                                </div>
                            ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                </CardContent>
            </Card>

        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-8">
                <CardHeader>
                    <CardTitle>Iniciar Apresentação</CardTitle>
                    <CardDescription>
                        Clique no botão abaixo para iniciar o modo de apresentação em ecrã inteiro com as configurações selecionadas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href={generatePlayUrl()} passHref>
                        <Button size="lg" className="w-full" disabled={selectedMarceneiros.length === 0}>
                            <MonitorPlay className="mr-2 h-5 w-5" />
                            Iniciar Apresentação
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    