'use client';

import { useState } from 'react';
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
import { format, isSameDay, isSameHour } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { CalendarTask } from '@/app/(app)/calendar/page';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: CalendarTask;
  onReschedule: (task: CalendarTask, newDate: Date) => void;
  onCancel: (task: CalendarTask) => void;
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  task,
  onReschedule,
  onCancel,
}: AppointmentDetailsModalProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(task.start);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isConfirmAlertOpen, setConfirmAlertOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    if (newDate) {
      onReschedule(task, newDate);
      toast({
        title: 'Tarefa reagendada!',
        description: `"${task.title}" foi movida para ${format(newDate, 'PPP', { locale: ptBR })}.`,
      });
      onClose();
    }
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
  
  const getTaskTime = (task: CalendarTask) => {
    const isAllDay = isSameDay(task.start, task.end) && isSameHour(task.start, 0) && isSameHour(task.end, 23);
    if (isAllDay || task.type === 'project') {
        return 'Dia Inteiro';
    }
    return `${format(task.start, 'HH:mm')} - ${format(task.end, 'HH:mm')}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsRescheduling(false); }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">{task.title}</DialogTitle>
            <DialogDescription>
              {task.subtitle || 'Detalhes da tarefa.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                  {task.responsible.avatarUrl && <AvatarImage src={task.responsible.avatarUrl} alt={task.responsible.name} />}
                  <AvatarFallback style={{ backgroundColor: task.responsible.color }} className='text-sm'>
                      {getInitials(task.responsible.name)}
                  </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">Responsável:</p>
                <p className="text-sm text-muted-foreground">{task.responsible.name}</p>
              </div>
            </div>
            <div>
                <p className="text-sm font-medium text-foreground">Data e Horário:</p>
                <p className="text-sm text-muted-foreground">{format(task.start, 'PPP', { locale: ptBR })} - {getTaskTime(task)}</p>
              </div>
          </div>

          {isRescheduling && (
              <div className="space-y-2">
                  <label className="text-sm font-medium">Nova Data</label>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !newDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newDate ? format(newDate, 'PPP', { locale: ptBR }) : <span>Escolha uma nova data</span>}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={setNewDate}
                          initialFocus
                        />
                      </PopoverContent>
                  </Popover>
              </div>
          )}

          <DialogFooter className='flex-row justify-between w-full'>
              <Button type="button" variant="destructive" onClick={() => setConfirmAlertOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {task.type === 'appointment' ? 'Cancelar' : 'Desagendar'}
              </Button>
              <div className='flex gap-2'>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Fechar
                </Button>
                {!isRescheduling ? (
                  <Button type="button" onClick={() => setIsRescheduling(true)}>
                      Reagendar
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSave} disabled={!newDate}>
                      Salvar Nova Data
                  </Button>
                )}
              </div>
          </DialogFooter>
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
