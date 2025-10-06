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


const appointmentSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  dates: z.array(z.date()).min(1, 'Selecione pelo menos uma data.'),
  memberIds: z.array(z.string()).min(1, 'Selecione pelo menos um membro da equipe.'),
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
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: '',
        description: '',
        dates: selectedDates || [],
        memberIds: [],
      });
    }
  }, [isOpen, selectedDates, form]);

  const onSubmit = (data: AppointmentFormValues) => {
    data.dates.forEach(date => {
        addAppointment({
          title: data.title,
          description: data.description || '',
          date: date.toISOString(),
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

  const { memberIds, dates } = form.watch();

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
