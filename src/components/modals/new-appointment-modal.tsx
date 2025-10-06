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
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format, set } from 'date-fns';
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
  dates: z.array(z.date()).min(1, 'Selecione pelo menos uma data.'),
  memberIds: z.array(z.string()).min(1, 'Selecione pelo menos um membro da equipe.'),
  timeType: z.enum(['all_day', 'morning', 'afternoon', 'specific']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).refine(data => {
    if (data.timeType === 'specific') {
        return !!data.startTime && !!data.endTime;
    }
    return true;
}, {
    message: 'Hora de início e fim são obrigatórias para horário específico.',
    path: ['startTime'],
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDates?: Date[];
  onDatesConsumed?: () => void;
}

export function NewAppointmentModal({ isOpen, onClose, selectedDates, onDatesConsumed }: NewAppointmentModalProps) {
  const { teamMembers, addAppointment } = useContext(AppContext);
  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: '',
      description: '',
      dates: [],
      memberIds: [],
      timeType: 'all_day',
      startTime: '09:00',
      endTime: '18:00',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        description: '',
        dates: selectedDates || [],
        memberIds: [],
        timeType: 'all_day',
        startTime: '09:00',
        endTime: '18:00',
      });
    }
  }, [isOpen, selectedDates, form]);

  const onSubmit = (data: AppointmentFormValues) => {
    data.dates.forEach(date => {
        let start = date;
        let end = date;

        switch (data.timeType) {
            case 'morning':
                start = set(date, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
                end = set(date, { hours: 12, minutes: 0, seconds: 0, milliseconds: 0 });
                break;
            case 'afternoon':
                start = set(date, { hours: 13, minutes: 0, seconds: 0, milliseconds: 0 });
                end = set(date, { hours: 18, minutes: 0, seconds: 0, milliseconds: 0 });
                break;
            case 'specific':
                if (data.startTime && data.endTime) {
                    const [startH, startM] = data.startTime.split(':').map(Number);
                    const [endH, endM] = data.endTime.split(':').map(Number);
                    start = set(date, { hours: startH, minutes: startM, seconds: 0, milliseconds: 0 });
                    end = set(date, { hours: endH, minutes: endM, seconds: 0, milliseconds: 0 });
                }
                break;
            case 'all_day':
            default:
                start = set(date, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
                end = set(date, { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 });
                break;
        }

        addAppointment({
          title: data.title,
          description: data.description || '',
          start: start.toISOString(),
          end: end.toISOString(),
          memberIds: data.memberIds,
        });
    });

    toast({
      title: 'Compromisso(s) criado(s)!',
      description: `O compromisso "${data.title}" foi agendado para ${data.dates.length} dia(s).`,
    });
    
    form.reset();
    if(onDatesConsumed) onDatesConsumed();
    onClose();
  };

  const { memberIds, timeType } = form.watch();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Novo Compromisso</DialogTitle>
          <DialogDescription>
            Agende uma tarefa ou evento para um ou mais membros da equipe.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Medição na casa do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes sobre o compromisso..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="dates"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Data(s)</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={'outline'}
                            className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value?.length && 'text-muted-foreground'
                            )}
                            >
                            {field.value?.length
                                ? `${field.value.length} dia(s) selecionado(s)`
                                : 'Escolha uma ou mais datas'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="multiple"
                            min={0}
                            selected={field.value}
                            onSelect={field.onChange}
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
                name="timeType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Horário</FormLabel>
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
            </div>
            
            {timeType === 'specific' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            )}

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membros Responsáveis</FormLabel>
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
              <Button type="submit">Salvar Compromisso</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
