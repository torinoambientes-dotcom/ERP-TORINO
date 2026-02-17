
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
import { CalendarIcon, MapPin, Scissors, Hammer, Truck } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format, set, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const appointmentSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date({ required_error: 'A data de início é obrigatória.'}),
  endDate: z.date({ required_error: 'A data de término é obrigatória.'}),
  memberIds: z.array(z.string()).min(1, 'Selecione pelo menos um membro da equipe.'),
  timeType: z.enum(['all_day', 'morning', 'afternoon', 'specific']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  category: z.enum(['generic', 'montagem', 'corte', 'producao']).default('generic'),
}).refine(data => {
    if (data.timeType === 'specific') {
        return !!data.startTime && !!data.endTime;
    }
    return true;
}, {
    message: 'Hora de início e fim são obrigatórias para horário específico.',
    path: ['startTime'],
}).refine(data => {
    return !isBefore(startOfDay(data.endDate), startOfDay(data.startDate));
}, {
    message: 'A data de término não pode ser anterior à data de início.',
    path: ['endDate'],
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onDateConsumed?: () => void;
  defaultCategory?: 'generic' | 'montagem' | 'corte' | 'producao';
}

export function NewAppointmentModal({ isOpen, onClose, selectedDate, onDateConsumed, defaultCategory = 'generic' }: NewAppointmentModalProps) {
  const { teamMembers, addAppointment } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      startDate: new Date(),
      endDate: new Date(),
      memberIds: [],
      timeType: 'all_day',
      startTime: '09:00',
      endTime: '18:00',
      category: defaultCategory,
    },
  });

  const selectedCategory = form.watch('category');

  useEffect(() => {
    if (isOpen) {
      const initialDate = selectedDate || new Date();
      form.reset({
        title: '',
        description: '',
        location: '',
        startDate: initialDate,
        endDate: initialDate,
        memberIds: [],
        timeType: 'all_day',
        startTime: '09:00',
        endTime: '18:00',
        category: defaultCategory,
      });
    }
  }, [isOpen, selectedDate, form, defaultCategory]);

  const onSubmit = (data: AppointmentFormValues) => {
    let start = data.startDate;
    let end = data.endDate;

    switch (data.timeType) {
        case 'morning':
            start = set(data.startDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
            end = set(data.endDate, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 });
            break;
        case 'afternoon':
            start = set(data.startDate, { hours: 13, minutes: 0, seconds: 0, milliseconds: 0 });
            end = set(data.endDate, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 });
            break;
        case 'specific':
            if (data.startTime && data.endTime) {
                const [startH, startM] = data.startTime.split(':').map(Number);
                const [endH, endM] = data.endTime.split(':').map(Number);
                start = set(data.startDate, { hours: startH, minutes: startM, seconds: 0, milliseconds: 0 });
                end = set(data.endDate, { hours: endH, minutes: endM, seconds: 0, milliseconds: 0 });
            }
            break;
        case 'all_day':
        default:
            start = set(data.startDate, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
            end = set(data.endDate, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
            break;
    }

    addAppointment({
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      start: start.toISOString(),
      end: end.toISOString(),
      memberIds: data.memberIds,
      category: data.category,
    });

    toast({
      title: 'Agendamento criado!',
      description: `"${data.title}" foi agendado com sucesso.`,
    });
    
    form.reset();
    if(onDateConsumed) onDateConsumed();
    onClose();
  };

  const { memberIds, timeType } = form.watch();

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'corte': return <Scissors className="h-4 w-4 mr-2" />;
      case 'producao': return <Hammer className="h-4 w-4 mr-2" />;
      case 'montagem': return <Truck className="h-4 w-4 mr-2" />;
      default: return null;
    }
  };

  const getTitleLabel = () => {
    switch (selectedCategory) {
      case 'corte': return 'Projeto / Cliente para Corte';
      case 'producao': return 'Projeto / Móvel em Produção';
      case 'montagem': return 'Projeto / Cliente para Montagem';
      default: return 'Título / Evento';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            {getCategoryIcon(selectedCategory)}
            Novo Agendamento: {
              selectedCategory === 'montagem' ? 'Montagem' : 
              selectedCategory === 'corte' ? 'Plano de Corte' : 
              selectedCategory === 'producao' ? 'Produção' : 'Compromisso'
            }
          </DialogTitle>
          <DialogDescription>
            Defina o período e os responsáveis. O status será mantido durante todos os dias selecionados.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTitleLabel()}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Projeto Residencial X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedCategory === 'montagem' && (
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição / Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes adicionais sobre o trabalho..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value
                                ? format(field.value, "dd/MM/yyyy")
                                : 'Escolha uma data'}
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
                            variant={'outline'}
                            className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                            )}
                            >
                            {field.value
                                ? format(field.value, "dd/MM/yyyy")
                                : 'Escolha uma data'}
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
            </div>

            <FormField
                control={form.control}
                name="timeType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Horário (Aplica-se a todos os dias)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="all_day">Dia Inteiro</SelectItem>
                            <SelectItem value="morning">Manhã (09:00 - 12:00)</SelectItem>
                            <SelectItem value="afternoon">Tarde (13:00 - 18:00)</SelectItem>
                            <SelectItem value="specific">Horário Específico</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            {timeType === 'specific' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            )}

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsáveis</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                       <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {memberIds.length > 0
                              ? `${memberIds.length} membro(s) selecionado(s)`
                              : "Selecione os membros"}
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
                                  <CommandItem
                                    key={member.id}
                                    value={member.name}
                                    onSelect={() => {
                                      const newMemberIds = memberIds.includes(member.id)
                                        ? memberIds.filter(id => id !== member.id)
                                        : [...memberIds, member.id];
                                      field.onChange(newMemberIds);
                                    }}
                                  >
                                    <Checkbox
                                        className='mr-2'
                                        checked={memberIds.includes(member.id)}
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Agendamento</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
