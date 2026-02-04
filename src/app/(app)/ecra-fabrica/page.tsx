'use client';
import { useState, useMemo, useContext, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MonitorPlay, Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/context/app-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import useLocalStorage from '@/hooks/use-local-storage';

export default function EcrãFabricaSettingsPage() {
  const { teamMembers } = useContext(AppContext);
  const [rotationTime, setRotationTime] = useLocalStorage('factoryDisplay:rotationTime', 30);
  const [customMessage, setCustomMessage] = useLocalStorage('factoryDisplay:customMessage', '');
  const [selectedMarceneiros, setSelectedMarceneiros] = useLocalStorage<string[]>('factoryDisplay:selectedMarceneiros', []);
  const [open, setOpen] = useState(false)

  const marceneiros = useMemo(() => {
    return (teamMembers || []).filter(member => member.role === 'Marceneiro');
  }, [teamMembers]);

  // Selecionar todos por padrão
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
    return `/apresentacao?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ecrã da Fábrica"
        description="Configure a exibição automática da programação semanal para a TV da produção."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configurações da Apresentação</CardTitle>
                    <CardDescription>
                       Personalize a rotação e os dados exibidos no ecrã.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Filtrar Produção (Opcional)</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                           <div className="flex gap-1 flex-wrap">
                            {selectedMarceneiros.length === 0 ? "Nenhum selecionado" : 
                             selectedMarceneiros.length === marceneiros.length ? "Todos os marceneiros" :
                              `${selectedMarceneiros.length} marceneiro(s) selecionado(s)`
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
                    <p className='text-xs text-muted-foreground'>O ecrã exibirá apenas a produção dos membros selecionados acima.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rotation-time">Tempo de Rotação por Dia (segundos)</Label>
                    <Input 
                      id="rotation-time"
                      type="number"
                      value={rotationTime}
                      onChange={e => setRotationTime(Number(e.target.value))}
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-message">Aviso ou Meta do Dia (Opcional)</Label>
                    <Textarea 
                      id="custom-message"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      placeholder="Ex: Entrega importante amanhã! Foco total no Projeto X."
                    />
                  </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-8 border-primary bg-primary/5">
                <CardHeader>
                    <CardTitle>Iniciar Apresentação</CardTitle>
                    <CardDescription>
                        Abre a programação em ecrã inteiro numa nova aba.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href={generatePlayUrl()} passHref target="_blank">
                        <Button size="lg" className="w-full text-lg font-bold" disabled={selectedMarceneiros.length === 0}>
                            <MonitorPlay className="mr-2 h-6 w-6" />
                            ABRIR NO MONITOR
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
