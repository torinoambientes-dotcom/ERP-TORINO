'use client';
import { useContext, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import type { TeamMember } from '@/lib/types';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { useUser } from '@/firebase';

const taskSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  dueDate: z.date({ required_error: 'A data é obrigatória.' }),
  assigneeIds: z.array(z.string()).min(1, 'Selecione pelo menos um membro.'),
});

const taskListSchema = z.object({
  tasks: z.array(taskSchema),
});

type TaskListFormValues = z.infer<typeof taskListSchema>;

interface NewTaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onDateConsumed?: () => void;
}

export function NewTaskListModal({ isOpen, onClose, selectedDate, onDateConsumed }: NewTaskListModalProps) {
  const { teamMembers, addTasks } = useContext(AppContext);
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<TaskListFormValues>({
    resolver: zodResolver(taskListSchema),
    defaultValues: {
      tasks: [{ title: '', description: '', dueDate: new Date(), assigneeIds: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        tasks: [{ title: '', description: '', dueDate: selectedDate || new Date(), assigneeIds: [] }],
      });
    }
  }, [isOpen, selectedDate, form]);

  const onSubmit = (data: TaskListFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para criar tarefas.',
      });
      return;
    }

    const tasksToAdd = data.tasks.map(task => ({
      ...task,
      dueDate: task.dueDate.toISOString(),
      creatorId: user.uid, // Add creatorId
      status: 'todo' as const,
      priority: 'medium' as const,
    }));
    
    addTasks(tasksToAdd);

    toast({
      title: 'Lista de Tarefas Criada!',
      description: `${data.tasks.length} tarefa(s) foram adicionadas ao calendário.`,
    });
    
    if (onDateConsumed) onDateConsumed();
    onClose();
  };

  const addNewTask = () => {
    append({
      title: '',
      description: '',
      dueDate: selectedDate || new Date(),
      assigneeIds: [],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Criar Lista de Tarefas</DialogTitle>
          <DialogDescription>
            Adicione várias tarefas de uma só vez para a sua equipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
            <div className="flex-grow space-y-4 overflow-y-auto pr-4 -mr-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg bg-muted/50 space-y-4 relative">
                  <h4 className="font-semibold">Tarefa #{index + 1}</h4>
                   <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <FormField
                        control={form.control}
                        name={`tasks.${index}.title`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Título</FormLabel>
                                <FormControl><Input placeholder="Ex: Finalizar acabamento do móvel X" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`tasks.${index}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descrição (Opcional)</FormLabel>
                                <FormControl><Textarea placeholder="Detalhes da tarefa..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                         <FormField
                            control={form.control}
                            name={`tasks.${index}.dueDate`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Data</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={'outline'} className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                            {field.value ? format(field.value, 'PPP') : 'Escolha uma data'}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`tasks.${index}.assigneeIds`}
                            render={({ field: formField }) => (
                                <FormItem>
                                    <FormLabel>Membros Responsáveis</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                {formField.value?.length > 0 ? `${formField.value.length} membro(s)` : "Selecione os membros"}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar membro..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                    {teamMembers.map((member: TeamMember) => (
                                                        <CommandItem key={member.id} value={member.name} onSelect={() => {
                                                            const newMemberIds = formField.value.includes(member.id) ? formField.value.filter(id => id !== member.id) : [...formField.value, member.id];
                                                            formField.onChange(newMemberIds);
                                                        }}>
                                                            <Checkbox className='mr-2' checked={formField.value.includes(member.id)} />
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6"><AvatarImage src={member.avatarUrl} /><AvatarFallback style={{ backgroundColor: member.color }} className="text-xs">{getInitials(member.name)}</AvatarFallback></Avatar>
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
                    </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addNewTask}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Tarefa
              </Button>
            </div>
            <DialogFooter className="pt-4 mt-auto border-t">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Tarefas</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
