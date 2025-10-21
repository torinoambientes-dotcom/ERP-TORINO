'use client';
import { useState, useMemo, useContext, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MonitorPlay, X, Check, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { AppContext } from '@/context/app-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { TeamMember } from '@/lib/types';
import { Badge } from '@/components/ui/badge';


export default function FactoryDisplaySettingsPage() {
  const { teamMembers } = useContext(AppContext);
  const [rotationTime, setRotationTime] = useState(60);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedMarceneiros, setSelectedMarceneiros] = useState<string[]>([]);
  const [open, setOpen] = useState(false)

  const marceneiros = useMemo(() => {
    return (teamMembers || []).filter(member => member.role === 'Marceneiro');
  }, [teamMembers]);

  // Select all by default when the component loads and marceneiros are available
  useEffect(() => {
    if (marceneiros.length > 0) {
      setSelectedMarceneiros(marceneiros.map(m => m.id));
    }
  }, [marceneiros]);

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
    return `/factory-display/play?${params.toString()}`;
  };

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
