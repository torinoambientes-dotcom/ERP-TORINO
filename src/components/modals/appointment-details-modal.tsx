'use client';

import { useState, useEffect } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { CalendarTask } from '@/app/(app)/calendar/page';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const appointmentEditSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().optional(),
  date: z.date(),
});

type AppointmentEditFormValues = z.infer<typeof appointmentEditSchema>;

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CalendarTask;
  onReschedule: (task: CalendarTask, newDate: Date) => void;
  onCancel: (task: CalendarTask) => void;
  onUpdate: (taskId: string, updates: { title: string; description: string }) => void;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  task,
  onReschedule,
  onCancel,
  onUpdate,
}: AppointmentDetailsModalProps) {
  const [isConfirmAlertOpen, setConfirmAlertOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AppointmentEditFormValues>({
    resolver: zodResolver(appointmentEditSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
    }
  });

  useEffect(() => {
    if (task && isOpen) {
      form.reset({
        title: task.title,
        description: task.subtitle || '',
        date: task.start,
      });
    }
  }, [task, isOpen, form]);

  const handleSaveChanges = (data: AppointmentEditFormValues) => {
    // Handle date change (reschedule)
    if (!isSameDay(data.date, task.start)) {
      onReschedule(task, data.date);
      toast({
        title: 'Tarefa reagendada!',
        description: `"${data.title}" foi movida para ${format(data.date, 'PPP', { locale: ptBR })}.`,
      });
    }
    
    // Handle title/description change for appointments
    if (task.type === 'appointment' && (data.title !== task.title || data.description !== task.subtitle)) {
        if(task.rawData.appointmentId) {
            onUpdate(task.rawData.appointmentId, { title: data.title, description: data.description || '' });
            toast({
                title: 'Compromisso atualizado!',
                description: 'O título e a descrição foram salvos.',
            });
        }
    }

    onClose();
  };

  const handleConfirmCancel = () => {
    onCancel(task);
    toast({
        title: 'Ação concluída!',
        description: task.type === 'appointment' 
            ? 'O compromisso foi cancelado.' 
            : 'A tarefa foi removida do calendário.',
    });
    setConfirmAlertOpen(false);
    onClose();
  };
  
  if (!isOpen) return null;

  const cancelDialogTitle = task.type === 'appointment' ? 'Cancelar Compromisso?' : 'Desagendar Tarefa?';
  const cancelDialogDescription = task.type === 'appointment'
    ? 'Esta ação removerá permanentemente este compromisso do calendário. Tem a certeza?'
    : 'Esta ação irá remover o agendamento desta tarefa, mas ela continuará a existir no projeto. Tem a certeza?';
  const cancelDialogActionText = task.type === 'appointment' ? 'Sim, cancelar' : 'Sim, desagendar';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Compromisso</DialogTitle>
            <DialogDescription>
              Altere os detalhes, reagende ou cancele o compromisso.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={task.type !== 'appointment'} />
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
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={task.type !== 'appointment'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nova Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                         <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma nova data</span>}
                            </Button>
                         </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
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

              <DialogFooter className='flex-row justify-between w-full pt-4'>
                  <Button type="button" variant="destructive" onClick={() => setConfirmAlertOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {task.type === 'appointment' ? 'Cancelar' : 'Desagendar'}
                  </Button>
                  <div className='flex gap-2'>
                    <Button type="button" variant="ghost" onClick={onClose}>
                      Fechar
                    </Button>
                    <Button type="submit">
                        Salvar Alterações
                    </Button>
                  </div>
              </DialogFooter>
            </form>
          </Form>

        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmAlertOpen} onOpenChange={setConfirmAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{cancelDialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>{cancelDialogDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {cancelDialogActionText}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
