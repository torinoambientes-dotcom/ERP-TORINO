'use client';

import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, MapPin, Scissors, Hammer, Truck, Pencil } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getInitials } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import type { TeamMember, Priority, StageStatus } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export interface WeeklyItemToEdit {
  id: string;
  type: 'corte' | 'producao' | 'montagem';
  title: string;
  description?: string;
  location?: string;
  responsible: TeamMember[];
  priority?: Priority;
  projectId?: string;
  envId?: string;
  furId?: string;
  isManual?: boolean;
  status?: 'todo' | 'done' | 'delayed' | 'in_progress';
  date: Date;
  start?: Date;
  end?: Date;
}

const editSchema = z.object({
  title: z.string().min(2, 'O título é obrigatório.'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date({ required_error: 'Data inicial é obrigatória.' }),
  endDate: z.date({ required_error: 'Data final é obrigatória.' }),
  memberIds: z.array(z.string()),
  category: z.enum(['montagem', 'corte', 'producao']),
  status: z.enum(['todo', 'in_progress', 'done', 'delayed']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
}).refine(data => {
  return !isBefore(startOfDay(data.endDate), startOfDay(data.startDate));
}, {
  message: 'A data final não pode ser anterior à data inicial.',
  path: ['endDate'],
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditWeeklyItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WeeklyItemToEdit | null;
}

export function EditWeeklyItemModal({ isOpen, onClose, item }: EditWeeklyItemModalProps) {
  const { teamMembers, projects, updateAppointment, updateProject } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      startDate: new Date(),
      endDate: new Date(),
      memberIds: [],
      category: 'montagem',
      status: 'todo',
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (isOpen && item) {
      const initialStart = item.start || item.date || new Date();
      const initialEnd = item.end || item.date || new Date();

      form.reset({
        title: item.title,
        description: item.description || '',
        location: item.location || '',
        startDate: initialStart,
        endDate: initialEnd,
        memberIds: item.responsible.map(m => m.id),
        category: item.type,
        status: (item.status as any) || 'todo',
        priority: item.priority || 'medium',
      });
    }
  }, [isOpen, item, form]);

  if (!item) return null;

  const isManual = !!item.isManual;

  const onSubmit = (data: EditFormValues) => {
    if (isManual) {
      // Update manual appointment
      updateAppointment(item.id, {
        title: data.title,
        description: data.description || '',
        location: data.location || '',
        category: data.category,
        start: data.startDate.toISOString(),
        end: data.endDate.toISOString(),
        memberIds: data.memberIds,
        status: data.status === 'in_progress' ? 'todo' : data.status,
      });
      toast({
        title: 'Agendamento atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    } else if (item.projectId && item.envId && item.furId) {
      // Update project furniture stage
      const project = projects.find(p => p.id === item.projectId);
      if (project) {
        const newProject = JSON.parse(JSON.stringify(project));
        const env = newProject.environments.find((e: any) => e.id === item.envId);
        const fur = env?.furniture.find((f: any) => f.id === item.furId);

        if (fur) {
          const stageKey = item.type === 'corte' ? 'cutting' : 'assembly';
          const newStatus: StageStatus = data.status === 'delayed' ? 'todo' : data.status;

          fur[stageKey] = {
            ...fur[stageKey],
            scheduledFor: data.startDate.toISOString(),
            responsibleIds: data.memberIds,
            priority: data.priority,
            status: newStatus,
          };

          if (newStatus === 'done') {
            fur[stageKey].completedAt = new Date().toISOString();
          } else {
            delete fur[stageKey].completedAt;
          }

          updateProject(newProject, project);
          toast({
            title: 'Etapa do projeto atualizada',
            description: 'As informações da tarefa foram salvas com sucesso.',
          });
        }
      }
    }

    onClose();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'corte': return <Scissors className="h-4 w-4 mr-2 text-orange-600" />;
      case 'producao': return <Hammer className="h-4 w-4 mr-2 text-blue-600" />;
      case 'montagem': return <Truck className="h-4 w-4 mr-2 text-green-600" />;
      default: return <Pencil className="h-4 w-4 mr-2" />;
    }
  };

  const selectedMemberIds = form.watch('memberIds') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            {getCategoryIcon(item.type)}
            Editar Programação
          </DialogTitle>
          <DialogDescription>
            Altere as informações da tarefa ou agendamento na programação semanal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título / Identificação</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!isManual} />
                  </FormControl>
                  {!isManual && (
                    <p className="text-[11px] text-muted-foreground italic">
                      Título atrelado ao móvel/projeto.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {isManual && item.type === 'montagem' && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Local / Endereço
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Rua das Flores, 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isManual && (
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes adicionais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Agendamento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'dd/MM/yyyy') : 'Escolha uma data'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isManual ? (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Término</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Escolha uma data'}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">A Fazer / Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                      <SelectItem value="delayed">Em Atraso</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsáveis</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start text-left font-normal truncate">
                          {selectedMemberIds.length > 0
                            ? `${selectedMemberIds.length} responsável(is) selecionado(s)`
                            : 'Selecione os responsáveis'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar responsável..." />
                        <CommandList>
                          <CommandEmpty>Nenhum responsável encontrado.</CommandEmpty>
                          <CommandGroup>
                            {teamMembers.map((member: TeamMember) => (
                              <CommandItem
                                key={member.id}
                                value={member.name}
                                onSelect={() => {
                                  const newMemberIds = selectedMemberIds.includes(member.id)
                                    ? selectedMemberIds.filter(id => id !== member.id)
                                    : [...selectedMemberIds, member.id];
                                  field.onChange(newMemberIds);
                                }}
                              >
                                <Checkbox
                                  className="mr-2"
                                  checked={selectedMemberIds.includes(member.id)}
                                />
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                    <AvatarFallback style={{ backgroundColor: member.color }} className="text-xs">
                                      {getInitials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{member.name}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
